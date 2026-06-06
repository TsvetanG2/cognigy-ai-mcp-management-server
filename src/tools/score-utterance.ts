/**
 * score_utterance tool [composite]
 * Scores a test utterance against a flow's intents and returns ranked matches.
 * Wraps generate_nlu_scores with a cleaner interface.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID containing the flow"),
  flowId: z
    .string()
    .describe("The flow ID to score against (will be converted to reference ID)"),
  localeId: z
    .string()
    .optional()
    .describe("Optional locale ID (will use flow's default if not provided)"),
  utterance: z
    .string()
    .describe("The test utterance to score"),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe("Minimum score threshold to include in results (0-1, default 0.4)"),
});

export function registerScoreUtterance(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "score_utterance",
    "Scores a test utterance against a flow's trained NLU intents. Returns the best matching intent with confidence score. Use this to quickly test if an utterance would be recognized correctly.",
    inputSchema.shape,
    async (args) => {
      const { projectId, flowId, localeId, utterance, threshold } =
        inputSchema.parse(args);

      // Get the flow to find its reference ID
      const flow = await client.readFlow({ flowId });
      const flowReferenceId = flow.referenceId;

      // Get locale reference ID
      let localeReferenceId: string;
      if (localeId) {
        // If localeId is provided, read it directly
        const locale = await client.readLocale({ localeId });
        localeReferenceId = locale.referenceId;
      } else {
        // Use flow's primary locale from project
        const locales = await client.indexLocales({
          projectId,
          limit: 10,
        });
        if (locales.items.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: "No locales found in project",
                  projectId,
                }),
              },
            ],
            isError: true,
          };
        }
        // Use the first locale's reference ID
        const firstLocale = locales.items[0]!;
        localeReferenceId = firstLocale.referenceId ?? firstLocale._id;
      }

      // Score the utterance
      const result = await client.generateNluScores({
        projectId,
        flowReferenceId,
        localeReferenceId,
        sentence: utterance,
      });

      // Parse and filter results
      const scores = result as unknown as Array<{
        id?: string;
        name?: string;
        score?: number;
        negated?: boolean;
      }>;

      const rankedIntents = (Array.isArray(scores) ? scores : [])
        .filter((i) => (i.score ?? 0) >= threshold)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .map((intent, rank) => ({
          rank: rank + 1,
          intent: intent.name,
          score: intent.score,
          confidence: intent.score && intent.score >= 0.8 ? "high" :
                      intent.score && intent.score >= 0.5 ? "medium" : "low",
        }));

      const topMatch = rankedIntents[0];
      const isConfident = topMatch && (topMatch.score ?? 0) >= 0.5;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                utterance,
                recognized: rankedIntents.length > 0,
                confident: isConfident,
                topMatch: topMatch
                  ? {
                      intent: topMatch.intent,
                      score: topMatch.score,
                      confidence: topMatch.confidence,
                    }
                  : null,
                alternativeMatches: rankedIntents.slice(1, 4),
                totalMatches: rankedIntents.length,
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
