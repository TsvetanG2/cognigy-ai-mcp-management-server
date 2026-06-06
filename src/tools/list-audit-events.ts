/**
 * list_audit_events tool
 * Lists audit events for the organization.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe("Filter audit events by project ID"),
  userId: z
    .string()
    .optional()
    .describe("Filter audit events by user ID"),
  eventType: z
    .string()
    .optional()
    .describe("Filter by event type (e.g., 'create', 'update', 'delete')"),
  resourceType: z
    .string()
    .optional()
    .describe("Filter by resource type (e.g., 'flow', 'intent', 'endpoint')"),
  startDate: z
    .string()
    .optional()
    .describe("Start date for audit events (ISO 8601 format)"),
  endDate: z
    .string()
    .optional()
    .describe("End date for audit events (ISO 8601 format)"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of events to return (default: 25, max: 100)"),
  skip: z
    .number()
    .min(0)
    .default(0)
    .describe("Number of items to skip for pagination"),
});

export function registerListAuditEvents(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "list_audit_events",
    "Lists Cognigy.AI audit events. Audit events track all changes made to resources (flows, intents, endpoints, etc.) by users. Useful for compliance and debugging.",
    inputSchema.shape,
    async (args) => {
      const { projectId, userId, eventType, resourceType, startDate, endDate, limit, skip } = inputSchema.parse(args);

      const result = await client.indexAuditEvents({
        projectId,
        userId,
        eventType,
        resourceType,
        startDate,
        endDate,
        limit,
        skip,
      } as any) as unknown as { items?: Record<string, unknown>[]; total?: number };

      const events = (result.items || []).map((event) => ({
        _id: event._id,
        eventType: event.eventType,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        userId: event.userId,
        userName: event.userName,
        projectId: event.projectId,
        timestamp: event.timestamp,
        changes: event.changes,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                events,
                total: result.total,
                pagination: {
                  limit,
                  skip,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
