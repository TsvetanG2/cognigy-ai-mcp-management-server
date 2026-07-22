/**
 * get_flow_settings tool
 * Gets the settings/configuration for a specific flow.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  flowId: z
    .string()
    .describe("The flow ID to retrieve settings for"),
});

export function registerGetFlowSettings(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_flow_settings",
    "Gets the settings/configuration of a Cognigy.AI flow. Returns NLU settings, thresholds, and other flow-level configurations. Use this before updating flow settings.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const { flowId } = inputSchema.parse(args);

      const settings = await client.readFlowSettings({ flowId });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(settings, null, 2),
          },
        ],
      };
    }
  );
}
