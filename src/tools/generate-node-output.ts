/**
 * generate_node_output tool
 * Uses Cognigy's generative AI to create content for a node.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const outputTypes = ["text", "adaptiveCard"] as const;

const inputSchema = z.object({
  flowId: z
    .string()
    .describe("The flow ID (used for context, e.g., persona settings)"),
  localeId: z
    .string()
    .describe("The locale ID for language-appropriate generation"),
  prompt: z
    .string()
    .describe("Natural language description of what content to generate (e.g., 'greeting message for a banking bot', 'poll for scheduling a meeting')"),
  outputType: z
    .enum(outputTypes)
    .default("text")
    .describe("Type of content to generate: 'text' for plain Say messages, 'adaptiveCard' for rich interactive cards"),
  generateContentLimit: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Maximum number of text variations to generate (for text output type, 1-10)"),
  lastOutput: z
    .string()
    .optional()
    .describe("Previous generation result to refine or continue from"),
});

export function registerGenerateNodeOutput(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "generate_node_output",
    "Uses Cognigy's generative AI to create content for Say nodes. Generates either plain text messages or rich Adaptive Cards based on a natural language prompt. Returns content you can use with create_node or update_node.",
    inputSchema.shape,
    async (args) => {
      const {
        flowId,
        localeId,
        prompt,
        outputType,
        generateContentLimit,
        lastOutput,
      } = inputSchema.parse(args);

      const params: Record<string, unknown> = {
        flowId,
        localeId,
        userText: prompt,
        outputType,
      };

      if (generateContentLimit !== undefined) {
        params.generateContentLimit = generateContentLimit;
      }
      if (lastOutput !== undefined) {
        params.lastOutput = lastOutput;
      }

      const result = await client.generateNodeOutput(
        params as unknown as Parameters<typeof client.generateNodeOutput>[0]
      );

      // Format output based on type
      if (result.outputType === "text") {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  outputType: "text",
                  generated: result.output,
                  count: Array.isArray(result.output) ? result.output.length : 1,
                  usage: "Use these text options with create_node or update_node to set the Say node content.",
                },
                null,
                2
              ),
            },
          ],
        };
      } else {
        // Adaptive Card output
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  outputType: "adaptiveCard",
                  generated: result.output,
                  usage: "Use this Adaptive Card structure with create_node or update_node to set the node content.",
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  );
}
