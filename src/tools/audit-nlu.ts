/**
 * audit_nlu tool [composite]
 * Audits NLU quality for a flow - identifies intents with issues.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  flowId: z
    .string()
    .describe("The flow ID to audit"),
  minSentences: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5)
    .describe("Minimum recommended sentences per intent (default 5)"),
  checkOverlap: z
    .boolean()
    .default(false)
    .describe("If true, tests for overlapping intents using NLU scoring (slower)"),
  projectId: z
    .string()
    .optional()
    .describe("Required if checkOverlap=true - project ID for NLU scoring"),
});

export function registerAuditNlu(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "audit_nlu",
    "Audits NLU quality for a flow. Identifies intents with too few training sentences, disabled intents, and optionally checks for overlapping intents. Use this before deployment to ensure NLU quality.",
    inputSchema.shape,
    async (args) => {
      const { flowId, minSentences, checkOverlap, projectId } =
        inputSchema.parse(args);

      // Get all intents in the flow
      const intentsResult = await client.indexIntents({
        flowId,
        limit: 100,
      });

      const intents = intentsResult.items;

      if (intents.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                flowId,
                message: "No intents found in flow",
                issues: [],
              }),
            },
          ],
        };
      }

      const issues: Array<{
        intentId: string;
        intentName: string;
        type: "few_sentences" | "no_sentences" | "disabled" | "overlap";
        severity: "high" | "medium" | "low";
        details: string;
        recommendation?: string;
      }> = [];

      // Check each intent
      for (const intent of intents) {
        // Get full intent details including sentences
        const intentDetail = await client.readIntent({
          flowId,
          intentId: intent._id,
        });

        // Get sentence count
        const sentences = await client.indexSentences({
          flowId,
          intentId: intent._id,
          limit: 1, // Just need the count
        });

        const sentenceCount = sentences.total;

        // Check for disabled intents
        if (intentDetail.isDisabled) {
          issues.push({
            intentId: intent._id,
            intentName: intent.name,
            type: "disabled",
            severity: "low",
            details: "Intent is disabled and won't match any utterances",
            recommendation: "Enable the intent or delete it if no longer needed",
          });
        }

        // Check for no sentences
        if (sentenceCount === 0) {
          issues.push({
            intentId: intent._id,
            intentName: intent.name,
            type: "no_sentences",
            severity: "high",
            details: "Intent has no training sentences",
            recommendation: `Add at least ${minSentences} example sentences or use generate_sentences`,
          });
        }
        // Check for too few sentences
        else if (sentenceCount < minSentences) {
          issues.push({
            intentId: intent._id,
            intentName: intent.name,
            type: "few_sentences",
            severity: "medium",
            details: `Intent has only ${sentenceCount} sentences (recommended: ${minSentences}+)`,
            recommendation: `Add ${minSentences - sentenceCount} more example sentences`,
          });
        }
      }

      // Check for overlapping intents if requested
      if (checkOverlap && projectId) {
        // Get flow reference ID
        const flow = await client.readFlow({ flowId });
        const flowReferenceId = flow.referenceId;

        // Get primary locale from project
        const locales = await client.indexLocales({
          projectId,
          limit: 1,
        });

        if (locales.items.length > 0) {
          const firstLocale = locales.items[0]!;
          const localeReferenceId = firstLocale.referenceId ?? firstLocale._id;

          // For each intent with sentences, test if its sentences confuse with other intents
          for (const intent of intents) {
            const sentences = await client.indexSentences({
              flowId,
              intentId: intent._id,
              limit: 3, // Test a few sentences
            });

            for (const sentence of sentences.items) {
              try {
                const scores = await client.generateNluScores({
                  projectId,
                  flowReferenceId,
                  localeReferenceId,
                  sentence: sentence.text,
                });

                const scoreArray = scores as unknown as Array<{
                  name?: string;
                  score?: number;
                }>;

                // Check if another intent scores highly
                const topMatches = (Array.isArray(scoreArray) ? scoreArray : [])
                  .filter((s) => (s.score ?? 0) >= 0.4)
                  .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

                if (topMatches.length >= 2) {
                  const top = topMatches[0];
                  const second = topMatches[1];

                  // If the second match is close to the top (within 0.2), flag overlap
                  if (
                    top &&
                    second &&
                    top.name !== intent.name &&
                    (top.score ?? 0) - (second.score ?? 0) < 0.2
                  ) {
                    // Check if we already have this overlap
                    const topName = top.name ?? "unknown";
                    const existingOverlap = issues.find(
                      (i) =>
                        i.type === "overlap" &&
                        i.intentName === intent.name &&
                        i.details.includes(topName)
                    );

                    if (!existingOverlap) {
                      issues.push({
                        intentId: intent._id,
                        intentName: intent.name,
                        type: "overlap",
                        severity: "medium",
                        details: `May overlap with "${topName}" (scores: ${intent.name}=${(second.score ?? 0).toFixed(2)}, ${topName}=${(top.score ?? 0).toFixed(2)})`,
                        recommendation:
                          "Review training sentences to make intents more distinct",
                      });
                    }
                  }
                }
              } catch {
                // Skip if scoring fails
              }
            }
          }
        }
      }

      // Calculate summary
      const highSeverity = issues.filter((i) => i.severity === "high").length;
      const mediumSeverity = issues.filter((i) => i.severity === "medium").length;
      const lowSeverity = issues.filter((i) => i.severity === "low").length;

      const overallHealth =
        highSeverity > 0 ? "poor" : mediumSeverity > 2 ? "fair" : "good";

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                flowId,
                intentCount: intents.length,
                overallHealth,
                summary: {
                  totalIssues: issues.length,
                  highSeverity,
                  mediumSeverity,
                  lowSeverity,
                },
                issues,
                recommendations:
                  highSeverity > 0
                    ? [
                        "Address high-severity issues (no training sentences) first",
                        "Use generate_sentences to quickly add training data",
                        "Run train_intents after making changes",
                      ]
                    : mediumSeverity > 0
                    ? [
                        "Add more training sentences to improve recognition",
                        "Review overlapping intents for clarity",
                      ]
                    : ["NLU configuration looks good!"],
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
