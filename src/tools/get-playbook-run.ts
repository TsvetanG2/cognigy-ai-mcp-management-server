/**
 * get_playbook_run tool
 * Gets detailed results of a specific playbook run including step-by-step assertion results.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  playbookId: z
    .string()
    .describe("The playbook ID"),
  playbookRunId: z
    .string()
    .describe("The playbook run ID to retrieve"),
});

export function registerGetPlaybookRun(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_playbook_run",
    "Gets detailed results of a playbook run including step-by-step assertion outcomes. Use this to analyze test failures and debug conversation flows.",
    inputSchema.shape,
    async (args) => {
      const { playbookId, playbookRunId } = inputSchema.parse(args);

      const run = await client.readPlaybookRun({ playbookId, playbookRunId });

      // Shape the step results for clarity
      const stepResults = (run.stepResults ?? []).map((step, index) => ({
        index,
        status: step.status,
        text: step.text,
        data: step.data,
        timeout: step.timeout,
        assertions: step.asserts?.map((a) => ({
          type: a.type,
          status: a.status,
          params: a.params,
          actual: a.actual,
        })),
      }));

      // Calculate summary
      const totalSteps = stepResults.length;
      const passedSteps = stepResults.filter((s) => s.status === "successful").length;
      const failedSteps = stepResults.filter((s) => s.status === "failed").length;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                id: run._id,
                playbookId,
                status: run.status,
                summary: {
                  totalSteps,
                  passed: passedSteps,
                  failed: failedSteps,
                },
                flowId: run.flowId,
                localeId: run.localeId,
                entrypoint: run.entrypoint,
                createdAt: run.createdAt,
                stepResults,
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
