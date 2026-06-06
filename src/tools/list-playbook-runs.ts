/**
 * list_playbook_runs tool
 * Lists playbook run history for a project or specific playbook.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  playbookId: z
    .string()
    .describe("The playbook ID to list runs for"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of runs to return (1-100, default 25)"),
});

export function registerListPlaybookRuns(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "list_playbook_runs",
    "Lists playbook run history showing pass/fail status, timestamps, and run metadata. Use this to review test results over time.",
    inputSchema.shape,
    async (args) => {
      const { playbookId, limit } = inputSchema.parse(args);

      const result = await client.indexPlaybookRuns({
        playbookId,
        limit,
      });

      const runs = result.items.map((run) => ({
        id: run._id,
        status: run.status,
        createdAt: run.createdAt,
        lastChanged: run.lastChanged,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                playbookId,
                total: result.total,
                returned: runs.length,
                runs,
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
