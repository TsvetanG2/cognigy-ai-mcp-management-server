/**
 * update_contact_profile tool
 * Updates an existing contact profile.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  profileId: z
    .string()
    .describe("The contact profile ID to update"),
  profile: z
    .record(z.unknown())
    .optional()
    .describe("Profile data to update (merges with existing)"),
  acceptedGDPR: z
    .boolean()
    .optional()
    .describe("Update GDPR consent status"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without updating. Set to false to actually update."),
});

export function registerUpdateContactProfile(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "update_contact_profile",
    "Updates an existing Cognigy.AI contact profile. Use this to modify stored user data or GDPR consent. MUTATING: Set dryRun=false to update.",
    inputSchema.shape,
    async (args) => {
      const { profileId, profile, acceptedGDPR, dryRun } = inputSchema.parse(args);

      // Verify the profile exists
      const existing = await client.readProfile({ profileId }) as unknown as Record<string, unknown>;

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to update the contact profile.",
                  existingProfile: {
                    _id: existing._id,
                    contactId: existing.contactId,
                    acceptedGDPR: existing.acceptedGDPR,
                  },
                  wouldUpdate: {
                    hasProfileChanges: !!profile,
                    acceptedGDPR: acceptedGDPR !== undefined ? acceptedGDPR : "(unchanged)",
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.updateProfile({
        profileId,
        profile,
        acceptedGDPR,
      } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                updated: true,
                profile: {
                  _id: result._id,
                  contactId: result.contactId,
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
