/**
 * unmerge_contact_profiles tool
 * Splits a merged contact profile into separate profiles.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  profileId: z
    .string()
    .describe("The merged profile ID to split"),
  contactId: z
    .string()
    .describe("The contact ID to extract into a separate profile"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without unmerging. Set to false to actually unmerge."),
});

export function registerUnmergeContactProfiles(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "unmerge_contact_profiles",
    "Splits a merged Cognigy.AI contact profile back into separate profiles. Use when profiles were incorrectly merged. MUTATING: Set dryRun=false to unmerge.",
    inputSchema.shape,
    async (args) => {
      const { profileId, contactId, dryRun } = inputSchema.parse(args);

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
                  message: "Validation passed. Set dryRun=false to unmerge the profile.",
                  existingProfile: {
                    _id: existing._id,
                    contactId: existing.contactId,
                    mergedContactIds: existing.mergedContactIds,
                  },
                  wouldExtract: {
                    contactId,
                  },
                  note: "The specified contact ID will be extracted into a new separate profile.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.unmergeProfiles({
        profileId,
        contactId,
      } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                unmerged: true,
                originalProfileId: profileId,
                newProfileId: result._id,
                extractedContactId: contactId,
                note: "Profile has been split. A new profile was created for the extracted contact ID.",
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
