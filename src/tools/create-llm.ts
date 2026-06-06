/**
 * create_llm tool
 * Creates a new large language model configuration.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to create the LLM in"),
  name: z
    .string()
    .describe("Name for the LLM configuration"),
  description: z
    .string()
    .optional()
    .describe("Description of the LLM's purpose"),
  provider: z
    .enum(["azureOpenAI", "openAI", "anthropic", "googleVertexAI", "googleGemini", "googleGenAI", "alephAlpha", "awsBedrock", "mistral"])
    .describe("The LLM provider"),
  modelType: z
    .string()
    .describe("The model type (e.g., 'gpt-4o', 'claude-3-opus-20240229', 'gemini-2.0-flash')"),
  connectionId: z
    .string()
    .describe("The connection ID containing the provider credentials"),
  modelGroup: z
    .enum(["chat", "completion", "embedding"])
    .optional()
    .describe("Model group: 'chat' for conversational, 'completion' for text generation, 'embedding' for embeddings"),
  isDefault: z
    .boolean()
    .optional()
    .describe("Set as the default LLM for the project"),
  providerConfig: z
    .record(z.unknown())
    .optional()
    .describe("Provider-specific configuration (e.g., resourceName, deploymentName for Azure)"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without creating. Set to false to actually create."),
});

export function registerCreateLlm(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "create_llm",
    "Creates a new Cognigy.AI large language model configuration. LLMs power Knowledge AI, AI Agents, and generative features. Requires a connection with provider credentials. MUTATING: Set dryRun=false to create.",
    inputSchema.shape,
    async (args) => {
      const { projectId, name, description, provider, modelType, connectionId, modelGroup, isDefault, providerConfig, dryRun } = inputSchema.parse(args);

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to create the LLM.",
                  wouldCreate: {
                    projectId,
                    name,
                    provider,
                    modelType,
                    connectionId,
                    modelGroup,
                    isDefault,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Build the request with provider-specific config
      const createParams: Record<string, unknown> = {
        projectId,
        name,
        description,
        provider,
        modelType,
        connectionId,
        modelGroup,
        isDefault,
      };

      // Add provider-specific settings
      if (providerConfig) {
        createParams[provider] = providerConfig;
      }

      const result = await client.createLargeLanguageModel(createParams as Parameters<typeof client.createLargeLanguageModel>[0]);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                created: true,
                llm: {
                  _id: result._id,
                  referenceId: result.referenceId,
                  name: result.name,
                  provider: result.provider,
                  modelType: result.modelType,
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
