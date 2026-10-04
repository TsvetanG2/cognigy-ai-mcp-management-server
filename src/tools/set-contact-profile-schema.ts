/**
 * set_contact_profile_schema tool
 * Sets the contact profile schema for a project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to set the profile schema for"),
  schema: z
    .array(z.object({
      field: z.string().describe("Display name of the field"),
      internal: z.string().describe("Reference name used in code, e.g. profile.<internal>"),
      type: z.enum(["string", "number", "boolean", "object"]).describe("Field type"),
    }))
    .min(1)
    .describe("Custom fields to add or update. Existing custom fields with the same internal name are replaced; others are kept."),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without updating. Set to false to actually update."),
});

export function registerSetContactProfileSchema(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "set_contact_profile_schema",
    "Adds or updates custom fields in the Cognigy.AI contact profile schema of a project. Built-in fields (firstname, email, ...) always exist; existing custom fields not listed are kept. MUTATING: Set dryRun=false to update.",
    inputSchema.shape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const { projectId, schema, dryRun } = inputSchema.parse(args);

      // The API replaces the custom field list, so merge with the current one
      const current = await client.getProfileSchema({ projectId });
      const merged = new Map((current.details ?? []).map((d) => [d.internal, d]));
      for (const entry of schema) merged.set(entry.internal, entry);
      const details = [...merged.values()];

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to update the profile schema.",
                  wouldSet: {
                    projectId,
                    fieldsToSet: schema.map((f) => f.internal),
                    resultingCustomFields: details,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      await client.setProfileSchema({ projectId, details });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                updated: true,
                projectId,
                customFields: details,
                note: "Profile schema has been updated.",
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
