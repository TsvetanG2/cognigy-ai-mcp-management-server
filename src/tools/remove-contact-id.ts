/**
 * remove_contact_id tool
 * Removes a contact ID from a profile.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  profileId: z
    .string()
    .describe("The contact profile ID to modify"),
  contactId: z
    .string()
    .describe("The contact ID to remove from the profile"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without removing. Set to false to actually remove."),
});

export function registerRemoveContactId(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "remove_contact_id",
    "Removes a contact ID from a Cognigy.AI contact profile. Use this when a user identifier should no longer be associated with a profile. MUTATING: Set dryRun=false to remove.",
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
                  message: "Validation passed. Set dryRun=false to remove the contact ID.",
                  existingProfile: {
                    _id: existing._id,
                    contactId: existing.contactId,
                    mergedContactIds: existing.mergedContactIds,
                  },
                  wouldRemove: {
                    contactId,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      await client.removeContactIdFromProfile({
        profileId,
        contactId,
      } as any);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                removed: true,
                profileId,
                contactId,
                note: "Contact ID has been removed from the profile.",
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
