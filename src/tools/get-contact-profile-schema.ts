/**
 * get_contact_profile_schema tool
 * Gets the contact profile schema for a project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to get the profile schema for"),
});

export function registerGetContactProfileSchema(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_contact_profile_schema",
    "Gets the contact profile schema for a Cognigy.AI project. The schema defines what custom fields can be stored in contact profiles.",
    inputSchema.shape,
    async (args) => {
      const { projectId } = inputSchema.parse(args);

      const result = await client.getProfileSchema({
        projectId,
      } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                projectId,
                schema: result.schema || result,
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
