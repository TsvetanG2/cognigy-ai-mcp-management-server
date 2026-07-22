/**
 * get_transcript tool (composite)
 * Assembles a readable transcript from conversation data.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  sessionId: z
    .string()
    .describe("The session ID to get transcript for"),
  projectId: z
    .string()
    .optional()
    .describe("Optional project ID to scope the query"),
  format: z
    .enum(["full", "compact"])
    .default("compact")
    .describe("Output format: 'full' includes all metadata, 'compact' shows just the conversation flow"),
});

export function registerGetTranscript(
  server: McpServer,
  client: CognigyClient,
  config: Config
): void {
  server.tool(
    "get_transcript",
    "Assembles a human-readable transcript for a Cognigy.AI session. Shows the conversation flow between user and bot in chronological order. Use this for reviewing conversation quality or debugging.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const parsed = inputSchema.parse(args);
      const projectId = parsed.projectId || config.defaultProjectId;

      const result = await client.readConversation({
        sessionId: parsed.sessionId,
        projectId,
      });

      // Sort by timestamp to ensure chronological order
      const sorted = [...result.items].sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeA - timeB;
      });

      if (parsed.format === "compact") {
        // Compact format: just source and text
        const transcript = sorted.map((entry) => {
          const speaker = entry.source === "user" ? "USER" : "BOT";
          return `[${speaker}] ${entry.inputText || "(no text)"}`;
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  sessionId: parsed.sessionId,
                  messageCount: result.total,
                  transcript,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Full format: include metadata
      const transcript = sorted.map((entry) => ({
        speaker: entry.source === "user" ? "USER" : "BOT",
        text: entry.inputText,
        type: entry.type,
        timestamp: entry.timestamp,
        flowName: entry.flowName,
        channel: entry.channel,
        inHandover: entry.inHandoverConversation,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                sessionId: parsed.sessionId,
                projectId,
                messageCount: result.total,
                channel: sorted[0]?.channel,
                flowName: sorted[0]?.flowName,
                transcript,
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
