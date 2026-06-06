/**
 * list_llms tool
 * Lists all large language models in a project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe("Filter LLMs by project ID. Omit for all accessible LLMs."),
  resourceLevel: z
    .enum(["organisation", "project"])
    .optional()
    .describe("Scope: 'organisation' for global LLMs, 'project' for project-specific"),
  filter: z
    .string()
    .optional()
    .describe("Filter LLMs by name"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of LLMs to return (default: 25, max: 100)"),
  skip: z
    .number()
    .min(0)
    .default(0)
    .describe("Number of items to skip for pagination"),
});

export function registerListLlms(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "list_llms",
    "Lists Cognigy.AI large language model configurations. LLMs are used for generative AI features like Knowledge AI, AI Agents, and node output generation. Shows provider, model type, and connection info.",
    inputSchema.shape,
    async (args) => {
      const { projectId, resourceLevel, filter, limit, skip } = inputSchema.parse(args);

      const result = await client.indexLargeLanguageModels({
        projectId,
        resourceLevel,
        filter,
        limit,
        skip,
      }) as unknown as { items?: Record<string, unknown>[]; total?: number; nextCursor?: string; previousCursor?: string };

      const llms = (result.items || []).map((llm) => ({
        _id: llm._id,
        referenceId: llm.referenceId,
        name: llm.name,
        description: llm.description,
        provider: llm.provider,
        modelType: llm.modelType,
        modelGroup: llm.modelGroup,
        isDefault: llm.isDefault,
        isCustomModel: llm.isCustomModel,
        resourceLevel: llm.resourceLevel,
        connectionId: llm.connectionId,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                llms,
                total: result.total,
                pagination: {
                  limit,
                  skip,
                  nextCursor: result.nextCursor,
                  previousCursor: result.previousCursor,
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
