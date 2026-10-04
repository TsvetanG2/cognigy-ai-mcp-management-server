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

// The payload arrives as a JSON string; return it as an object when possible
function parsePayload(payload: unknown): unknown {
  if (typeof payload !== "string") return payload;
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
}

export function registerGetAuditEvent(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_audit_event",
    "Gets detailed information about a specific Cognigy.AI audit event. Returns the full change details including before/after values.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
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
                timestamp: event.timestamp,
                type: event.type,
                user: event.user,
                userId: event.userReference,
                projectId: event.projectReference,
                resources: event.chain,
                performedBy: event.performedBy,
                payload: parsePayload(event.payload),
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
