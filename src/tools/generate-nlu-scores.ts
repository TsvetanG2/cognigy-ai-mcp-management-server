/**
 * generate_nlu_scores tool
 * Scores a test utterance against a flow's trained intents.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID containing the flow"),
  flowReferenceId: z
    .string()
    .describe("The reference ID (UUID) of the flow to score against"),
  localeReferenceId: z
    .string()
    .describe("The reference ID (UUID) of the locale"),
  sentence: z
    .string()
    .describe("The test utterance to score against trained intents"),
});

export function registerGenerateNluScores(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "generate_nlu_scores",
    "Scores a test utterance against a flow's trained NLU intents. Returns ranked intent matches with confidence scores. Use this to test NLU recognition before deployment.",
    inputSchema.shape,
    async (args) => {
      const { projectId, flowReferenceId, localeReferenceId, sentence } =
        inputSchema.parse(args);

      const result = await client.generateNluScores({
        projectId,
        flowReferenceId,
        localeReferenceId,
        sentence,
      });

      // The API returns an array of scored intents
      // Shape it for clarity
      const scores = result as unknown as Array<{
        id?: string;
        name?: string;
        score?: number;
        negated?: boolean;
        confirmationSentence?: string;
        disambiguationSentence?: string;
        flow?: string;
      }>;

      const rankedIntents = (Array.isArray(scores) ? scores : [])
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .map((intent, rank) => ({
          rank: rank + 1,
          intentId: intent.id,
          intentName: intent.name,
          score: intent.score,
          negated: intent.negated,
          confirmationSentence: intent.confirmationSentence,
          disambiguationSentence: intent.disambiguationSentence,
        }));

      const topMatch = rankedIntents[0];

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                sentence,
                matchCount: rankedIntents.length,
                topMatch: topMatch
                  ? {
                      intent: topMatch.intentName,
                      score: topMatch.score,
                    }
                  : null,
                rankedIntents,
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
