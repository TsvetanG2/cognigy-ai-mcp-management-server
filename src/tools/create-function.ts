/**
 * create_function tool
 * Creates a new function in a project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to create the function in"),
  name: z
    .string()
    .describe("Name for the function"),
  description: z
    .string()
    .optional()
    .describe("Description of the function's purpose"),
  type: z
    .string()
    .optional()
    .describe("Function type"),
  code: z
    .string()
    .optional()
    .describe("The function code (JavaScript/TypeScript)"),
  parameters: z
    .record(z.unknown())
    .optional()
    .describe("Function parameters schema"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without creating. Set to false to actually create."),
});

export function registerCreateFunction(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "create_function",
    "Creates a new Cognigy.AI Function. Functions are custom code modules for integrations, scheduled jobs, or computations. MUTATING: Set dryRun=false to create.",
    inputSchema.shape,
    async (args) => {
      const { projectId, name, code, dryRun } = inputSchema.parse(args);

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to create the function.",
                  wouldCreate: {
                    projectId,
                    name,
                    hasCode: !!code,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.createFunction({
        projectId,
        name,
        code,
      } as Parameters<typeof client.createFunction>[0]) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                created: true,
                function: {
                  _id: result._id,
                  referenceId: result.referenceId,
                  name: result.name,
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
