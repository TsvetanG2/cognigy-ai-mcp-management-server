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
    .record(z.string(), z.unknown())
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
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
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
                    contactIds: existing.contactIds,
                    acceptedGDPR: (existing.profile as Record<string, unknown> | undefined)?.accepted_gdpr,
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

      const profileData: Record<string, unknown> = { ...profile };
      if (acceptedGDPR !== undefined) profileData.accepted_gdpr = acceptedGDPR;

      // The update endpoint returns no body, so report what was sent
      await client.updateProfile({
        profileId,
        profile: profileData,
      } as Parameters<typeof client.updateProfile>[0]);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                updated: true,
                profileId,
                fieldsUpdated: Object.keys(profileData),
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
