/**
 * clone_flow tool
 * Clones a flow within a project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  flowId: z
    .string()
    .describe("The flow ID to clone"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without cloning. Set to false to actually clone."),
});

export function registerCloneFlow(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "clone_flow",
    "Clones a Cognigy.AI flow within the same project. Creates an exact copy of the flow including all nodes, intents, and configurations. The cloned flow gets an auto-generated name. MUTATING: Set dryRun=false to clone.",
    inputSchema.shape,
    async (args) => {
      const { flowId, dryRun } = inputSchema.parse(args);

      // Get the original flow details
      const originalFlow = await client.readFlow({ flowId });

      // In dry run mode, validate and return what would happen
      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to clone the flow.",
                  wouldClone: {
                    sourceFlowId: flowId,
                    sourceName: originalFlow.name,
                    note: "The cloned flow will receive an auto-generated name.",
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Clone the flow
      const result = await client.cloneFlow({ flowId });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                cloned: true,
                sourceFlowId: flowId,
                sourceName: originalFlow.name,
                newFlow: {
                  _id: result._id,
                  name: result.name,
                  referenceId: result.referenceId,
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
