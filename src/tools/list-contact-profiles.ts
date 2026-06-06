/**
 * list_contact_profiles tool
 * Lists contact profiles in a project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe("Filter contact profiles by project ID"),
  filter: z
    .string()
    .optional()
    .describe("Filter profiles by contact ID or other fields"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of profiles to return (default: 25, max: 100)"),
  skip: z
    .number()
    .min(0)
    .default(0)
    .describe("Number of items to skip for pagination"),
});

export function registerListContactProfiles(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "list_contact_profiles",
    "Lists Cognigy.AI contact profiles. Contact profiles store user data across sessions (name, preferences, conversation history metadata).",
    inputSchema.shape,
    async (args) => {
      const { projectId, filter, limit, skip } = inputSchema.parse(args);

      const result = await client.indexProfiles({
        projectId,
        filter,
        limit,
        skip,
      } as any) as unknown as { items?: Record<string, unknown>[]; total?: number; nextCursor?: string; previousCursor?: string };

      const profiles = (result.items || []).map((profile) => ({
        _id: profile._id,
        referenceId: profile.referenceId,
        contactId: profile.contactId,
        acceptedGDPR: profile.acceptedGDPR,
        goals: profile.goals,
        createdAt: typeof profile.createdAt === "number"
          ? new Date(profile.createdAt * 1000).toISOString()
          : undefined,
        lastChanged: typeof profile.lastChanged === "number"
          ? new Date(profile.lastChanged * 1000).toISOString()
          : undefined,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                profiles,
                total: result.total,
                pagination: {
                  limit,
                  skip,
                  nextCursor: result.nextCursor,
                  previousCursor: result.previousCursor,
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
