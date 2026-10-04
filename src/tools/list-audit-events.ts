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
  user: z
    .string()
    .optional()
    .describe("Filter by the user who performed the action (as shown in the event's 'user' field)"),
  eventType: z
    .string()
    .optional()
    .describe("Filter by event type (e.g., 'create', 'update', 'delete')"),
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
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const { projectId, user, eventType, limit, skip } = inputSchema.parse(args);

      const result = await client.indexAuditEvents({
        projectId,
        ...(user ? { actor: [user] } : {}),
        ...(eventType ? { type: [eventType] } : {}),
        limit,
        skip,
      } as any) as unknown as { items?: Record<string, unknown>[]; total?: number };

      const events = (result.items || []).map((event) => ({
        _id: event._id,
        timestamp: event.timestamp,
        type: event.type,
        user: event.user,
        projectId: event.projectReference,
        resources: event.chain,
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
