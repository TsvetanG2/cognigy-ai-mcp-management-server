/**
 * delete_contact_profile tool
 * Deletes a contact profile.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  profileId: z
    .string()
    .describe("The contact profile ID to delete"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without deleting. Set to false to actually delete."),
});

export function registerDeleteContactProfile(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "delete_contact_profile",
    "Deletes a Cognigy.AI contact profile. WARNING: This permanently removes all stored user data for this profile. MUTATING: Set dryRun=false to delete.",
    inputSchema.shape,
    async (args) => {
      const { profileId, dryRun } = inputSchema.parse(args);

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
                  message: "Validation passed. Set dryRun=false to delete the contact profile.",
                  wouldDelete: {
                    _id: existing._id,
                    contactId: existing.contactId,
                  },
                  warning: "Deleting a contact profile permanently removes all stored user data.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      await client.deleteProfile({ profileId } as any);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                deleted: true,
                profileId,
                note: "Contact profile has been permanently deleted.",
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
