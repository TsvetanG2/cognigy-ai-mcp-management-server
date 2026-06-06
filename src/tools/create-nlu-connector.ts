/**
 * create_nlu_connector tool
 * Creates a new NLU connector in a project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to create the NLU connector in"),
  name: z
    .string()
    .describe("Name for the NLU connector"),
  type: z
    .enum(["alexa", "dialogflow", "dialogflowBuiltIn", "amazonLexBuiltIn", "luis", "watson", "noNlu", "cognigy", "code", "generativeAI", "lex"])
    .describe("The NLU connector type"),
  settings: z
    .record(z.unknown())
    .optional()
    .describe("Type-specific settings for the NLU connector"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without creating. Set to false to actually create."),
});

export function registerCreateNluConnector(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "create_nlu_connector",
    "Creates a new Cognigy.AI NLU connector for external NLU service integration. Supports Dialogflow, LUIS, Watson, Alexa, Lex, and custom code connectors. MUTATING: Set dryRun=false to create.",
    inputSchema.shape,
    async (args) => {
      const { projectId, name, type, settings, dryRun } = inputSchema.parse(args);

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to create the NLU connector.",
                  wouldCreate: {
                    projectId,
                    name,
                    type,
                    hasSettings: !!settings,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.createNLUConnector({
        projectId,
        name,
        type,
        ...settings,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                created: true,
                connector: {
                  _id: result._id,
                  referenceId: result.referenceId,
                  name: result.name,
                  type: result.type,
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
