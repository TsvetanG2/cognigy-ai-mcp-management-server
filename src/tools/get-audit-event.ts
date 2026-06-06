/**
 * get_audit_event tool
 * Gets details of a specific audit event.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  auditEventId: z
    .string()
    .describe("The audit event ID to retrieve"),
});

export function registerGetAuditEvent(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_audit_event",
    "Gets detailed information about a specific Cognigy.AI audit event. Returns the full change details including before/after values.",
    inputSchema.shape,
    async (args) => {
      const { auditEventId } = inputSchema.parse(args);

      const event = await client.readAuditEvent({ auditEventId } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                _id: event._id,
                eventType: event.eventType,
                resourceType: event.resourceType,
                resourceId: event.resourceId,
                resourceName: event.resourceName,
                userId: event.userId,
                userName: event.userName,
                projectId: event.projectId,
                timestamp: event.timestamp,
                changes: event.changes,
                metadata: event.metadata,
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
