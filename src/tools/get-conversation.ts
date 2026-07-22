/**
 * get_conversation tool
 * Gets conversation details for a specific session.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  sessionId: z
    .string()
    .describe("The session ID to get conversation for"),
  projectId: z
    .string()
    .optional()
    .describe("Optional project ID to scope the query"),
});

export function registerGetConversation(
  server: McpServer,
  client: CognigyClient,
  config: Config
): void {
  server.tool(
    "get_conversation",
    "Gets conversation details for a specific Cognigy.AI session. Returns all inputs/outputs, timestamps, and metadata for the session. Use this to analyze a complete conversation thread.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const parsed = inputSchema.parse(args);
      const projectId = parsed.projectId || config.defaultProjectId;

      const result = await client.readConversation({
        sessionId: parsed.sessionId,
        projectId,
      });

      const entries = result.items.map((entry) => ({
        inputId: entry.inputId,
        sessionId: entry.sessionId,
        contactId: entry.contactId,
        inputText: entry.inputText,
        type: entry.type,
        source: entry.source,
        flowName: entry.flowName,
        channel: entry.channel,
        timestamp: entry.timestamp,
        endpointName: entry.endpointName,
        localeName: entry.localeName,
        inHandoverRequest: entry.inHandoverRequest,
        inHandoverConversation: entry.inHandoverConversation,
        rating: entry.rating,
        ratingComment: entry.ratingComment,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                sessionId: parsed.sessionId,
                projectId,
                total: result.total,
                entries,
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
