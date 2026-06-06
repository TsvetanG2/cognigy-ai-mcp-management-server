/**
 * merge_contact_profiles tool
 * Merges two contact profiles into one.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  sourceProfileId: z
    .string()
    .describe("The source profile ID (will be merged into target)"),
  targetProfileId: z
    .string()
    .describe("The target profile ID (will receive the merged data)"),
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
    "Merges two Cognigy.AI contact profiles into one. The source profile data is merged into the target, and all contact IDs are combined. Use when the same user has multiple profiles. MUTATING: Set dryRun=false to merge.",
    inputSchema.shape,
    async (args) => {
      const { sourceProfileId, targetProfileId, dryRun } = inputSchema.parse(args);

      // Verify both profiles exist
      const [sourceProfile, targetProfile] = await Promise.all([
        client.readProfile({ profileId: sourceProfileId }) as unknown as Record<string, unknown>,
        client.readProfile({ profileId: targetProfileId }) as unknown as Record<string, unknown>,
      ]);

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to merge the profiles.",
                  sourceProfile: {
                    _id: sourceProfile._id,
                    contactId: sourceProfile.contactId,
                  },
                  targetProfile: {
                    _id: targetProfile._id,
                    contactId: targetProfile.contactId,
                  },
                  note: "Source profile will be merged into target profile.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.mergeProfiles({
        sourceProfileId,
        targetProfileId,
      } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                merged: true,
                resultProfile: {
                  _id: result._id || targetProfileId,
                },
                note: "Profiles have been merged. The source profile data is now in the target.",
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
