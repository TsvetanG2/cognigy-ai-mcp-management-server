/**
 * get_conversations tool
 * Lists conversations for specific contact IDs.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to get conversations from"),
  contactIds: z
    .array(z.string())
    .min(1)
    .describe("Array of contact IDs to get conversations for"),
});

export function registerGetConversations(
  server: McpServer,
  client: CognigyClient,
  config: Config
): void {
  server.tool(
    "get_conversations",
    "Gets conversations for specific contacts in a Cognigy.AI project. Returns conversation history including inputs, outputs, and metadata. Use this to analyze user interactions.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const parsed = inputSchema.parse(args);
      const projectId = parsed.projectId || config.defaultProjectId;

      if (!projectId) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "projectId is required",
              }),
            },
          ],
          isError: true,
        };
      }

      const result = await client.indexConversations({
        projectId,
        contactIds: parsed.contactIds,
      });

      const conversations = result.items.map((conv) => ({
        sessionId: conv.sessionId,
        contactId: conv.contactId,
        projectId: conv.projectId,
        projectName: conv.projectName,
        flowName: conv.flowName,
        channel: conv.channel,
        timestamp: conv.timestamp,
        inputText: conv.inputText,
        type: conv.type,
        source: conv.source,
        inHandoverRequest: conv.inHandoverRequest,
        inHandoverConversation: conv.inHandoverConversation,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                projectId,
                contactIds: parsed.contactIds,
                total: result.total,
                conversations,
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
