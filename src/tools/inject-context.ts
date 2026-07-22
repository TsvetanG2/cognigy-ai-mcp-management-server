/**
 * inject_context tool
 * Injects context data into a session.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  sessionId: z
    .string()
    .describe("The session ID to inject context into"),
  userId: z
    .string()
    .describe("The user ID for the session"),
  context: z
    .record(z.string(), z.any())
    .describe("The context object to inject (key-value pairs)"),
});

export function registerInjectContext(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "inject_context",
    "Injects context data into a Cognigy.AI session. Context is shared state accessible by flow nodes. Use this to set user data, preferences, or state before/during conversations.",
    inputSchema.shape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args) => {
      const { sessionId, userId, context } = inputSchema.parse(args);

      const result = await client.injectContext({
        sessionId,
        userId,
        context,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                sessionId,
                userId,
                injected: true,
                context: result,
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
