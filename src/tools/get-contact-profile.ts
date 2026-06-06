/**
 * get_contact_profile tool
 * Gets detailed information about a specific contact profile.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  profileId: z
    .string()
    .describe("The contact profile ID to retrieve"),
});

export function registerGetContactProfile(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_contact_profile",
    "Gets detailed information about a specific Cognigy.AI contact profile. Returns stored user data, goals, and profile metadata.",
    inputSchema.shape,
    async (args) => {
      const { profileId } = inputSchema.parse(args);

      const profile = await client.readProfile({ profileId }) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                _id: profile._id,
                referenceId: profile.referenceId,
                contactId: profile.contactId,
                acceptedGDPR: profile.acceptedGDPR,
                goals: profile.goals,
                profile: profile.profile,
                mergedContactIds: profile.mergedContactIds,
                createdAt: typeof profile.createdAt === "number"
                  ? new Date(profile.createdAt * 1000).toISOString()
                  : undefined,
                lastChanged: typeof profile.lastChanged === "number"
                  ? new Date(profile.lastChanged * 1000).toISOString()
                  : undefined,
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
