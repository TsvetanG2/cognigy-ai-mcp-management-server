/**
 * get_latest_log_entries tool
 * Gets the latest log entries from a project for debugging.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const logLevels = ["debug", "info", "warn", "error"] as const;

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to retrieve logs from"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of log entries to return (1-100, default 25)"),
  type: z
    .array(z.enum(logLevels))
    .optional()
    .describe("Filter by log level(s): debug, info, warn, error"),
  flowName: z
    .string()
    .optional()
    .describe("Filter logs by flow name"),
});

export function registerGetLatestLogEntries(
  server: McpServer,
  client: CognigyClient,
  config: Config
): void {
  server.tool(
    "get_latest_log_entries",
    "Gets the latest execution log entries from a Cognigy.AI project. Use this for debugging flow execution, viewing errors, or monitoring agent behavior.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const parsed = inputSchema.parse(args);
      const projectId = parsed.projectId || config.defaultProjectId;

      if (!projectId) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "projectId is required. Either provide it as a parameter or set COGNIGY_DEFAULT_PROJECT_ID environment variable.",
              }),
            },
          ],
          isError: true,
        };
      }

      const result = await client.indexLogEntries({
        projectId,
        limit: parsed.limit,
        type: parsed.type,
        flowName: parsed.flowName,
      });

      const logs = result.items.map((entry) => ({
        id: entry._id,
        timestamp: entry.timestamp,
        type: entry.type,
        message: entry.msg,
        traceId: entry.traceId,
        meta: entry.meta,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                projectId,
                total: result.total,
                returned: logs.length,
                logs,
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
