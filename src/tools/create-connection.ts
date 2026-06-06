/**
 * create_connection tool
 * Creates a new connection in a project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to create the connection in"),
  name: z
    .string()
    .describe("Name for the connection"),
  type: z
    .string()
    .describe("Connection type (from extension schema, e.g., 'http-basic-auth', 'api-key', etc.)"),
  fields: z
    .record(z.string())
    .optional()
    .describe("Connection field values as key-value pairs (e.g., { apiKey: '...', baseUrl: '...' })"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without creating. Set to false to actually create."),
});

export function registerCreateConnection(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "create_connection",
    "Creates a new Cognigy.AI connection for external service integration. Connections securely store credentials like API keys, passwords, and tokens. MUTATING: Set dryRun=false to create.",
    inputSchema.shape,
    async (args) => {
      const { projectId, name, type, fields, dryRun } = inputSchema.parse(args);

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to create the connection.",
                  wouldCreate: {
                    projectId,
                    name,
                    type,
                    fieldCount: fields ? Object.keys(fields).length : 0,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Create the connection
      const result = await client.createConnection({
        projectId,
        name,
        type,
        ...fields,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                created: true,
                connection: {
                  _id: result._id,
                  referenceId: result.referenceId,
                  name: result.name,
                  type,
                },
                note: "Connection created. Secret values are stored securely and not returned.",
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
