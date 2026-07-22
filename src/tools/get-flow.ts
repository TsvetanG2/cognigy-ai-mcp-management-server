/**
 * get_flow tool
 * Gets detailed information about a specific flow.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  flowId: z
    .string()
    .describe("The flow ID to retrieve"),
});

export function registerGetFlow(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_flow",
    "Gets detailed metadata about a specific Cognigy.AI flow. Returns flow configuration, locale info, and timestamps. Use this to inspect a flow before modifying it.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const { flowId } = inputSchema.parse(args);

      const flow = await client.readFlow({ flowId });

      const result = {
        id: flow._id,
        name: flow.name,
        description: flow.description,
        createdAt: flow.createdAt,
        lastChanged: flow.lastChanged,
        createdBy: flow.createdBy,
        lastChangedBy: flow.lastChangedBy,
        localeReference: flow.localeReference,
        isTrainingOutOfDate: flow.isTrainingOutOfDate,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
