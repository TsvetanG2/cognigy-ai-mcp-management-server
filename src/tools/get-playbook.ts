/**
 * get_playbook tool
 * Gets detailed information about a specific playbook including all steps and assertions.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  playbookId: z
    .string()
    .describe("The playbook ID to retrieve"),
});

export function registerGetPlaybook(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_playbook",
    "Gets detailed playbook configuration including all steps and assertions. Use this to understand what a playbook tests before running it.",
    inputSchema.shape,
    async (args) => {
      const { playbookId } = inputSchema.parse(args);

      const playbook = await client.readPlaybook({ playbookId });

      // Shape the steps with their assertions
      const steps = (playbook.steps ?? []).map((step, index) => ({
        index,
        text: step.text,
        data: step.data,
        assertions: (step.asserts ?? []).map((a) => ({
          type: a.type,
          params: a.params,
        })),
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                id: playbook._id,
                name: playbook.name,
                abortOnError: playbook.abortOnError,
                timeout: playbook.timeout,
                stepCount: steps.length,
                steps,
                createdAt: playbook.createdAt,
                lastChanged: playbook.lastChanged,
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
