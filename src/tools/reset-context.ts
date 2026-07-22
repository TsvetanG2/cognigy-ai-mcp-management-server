/**
 * reset_context tool
 * Resets the context for a session.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  sessionId: z
    .string()
    .describe("The session ID to reset context for"),
  userId: z
    .string()
    .describe("The user ID for the session"),
  flowReferenceId: z
    .string()
    .describe("The flow reference ID"),
  entrypoint: z
    .string()
    .describe("The entrypoint (project or snapshot ID)"),
});

export function registerResetContext(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "reset_context",
    "Resets the context for a Cognigy.AI session, clearing all stored state. Use this to start a fresh conversation or clear user data during testing.",
    inputSchema.shape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const { sessionId, userId, flowReferenceId, entrypoint } = inputSchema.parse(args);

      const result = await client.resetContext({
        sessionId,
        userId,
        flowReferenceId,
        entrypoint,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                sessionId,
                userId,
                reset: true,
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
