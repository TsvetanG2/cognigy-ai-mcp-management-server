/**
 * merge_contact_profiles tool
 * Merges the profile of a contact ID into a target contact profile.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID the profiles belong to"),
  targetProfileId: z
    .string()
    .describe("The profile ID that will receive the merged data"),
  sourceContactId: z
    .string()
    .describe("A contact ID whose profile will be merged into the target (see contactIds in get_contact_profile / export_contact_profile)"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without merging. Set to false to actually merge."),
});

export function registerMergeContactProfiles(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "merge_contact_profiles",
    "Merges the Cognigy.AI contact profile of a given contact ID into a target profile, combining their data and contact IDs. Use when the same user has multiple profiles. MUTATING: Set dryRun=false to merge.",
    inputSchema.shape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args) => {
      const { projectId, targetProfileId, sourceContactId, dryRun } = inputSchema.parse(args);

      // Verify the target profile exists
      const targetProfile = await client.readProfile({ profileId: targetProfileId });

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to merge the profiles.",
                  targetProfile: {
                    _id: targetProfile._id,
                    contactIds: targetProfile.contactIds,
                  },
                  sourceContactId,
                  note: "The profile of sourceContactId will be merged into the target profile.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.mergeProfiles({
        profileId: targetProfileId,
        contactId: sourceContactId,
        projectId,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                merged: true,
                resultProfile: {
                  _id: result._id ?? targetProfileId,
                  contactIds: result.contactIds,
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
