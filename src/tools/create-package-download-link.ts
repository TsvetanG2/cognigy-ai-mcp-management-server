/**
 * create_package_download_link tool
 * Creates a temporary download link for a package.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  packageId: z
    .string()
    .describe("The package ID to create a download link for"),
});

export function registerCreatePackageDownloadLink(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "create_package_download_link",
    "Creates a temporary download link for a Cognigy.AI package. The link can be used to download the package file for backup or transfer. Links are time-limited.",
    inputSchema.shape,
    async (args) => {
      const { packageId } = inputSchema.parse(args);

      // Get package info for context
      let packageInfo: { name?: string } = {};
      try {
        const pkg = await client.readPackage({ packageId });
        packageInfo = {
          name: pkg.name,
        };
      } catch {
        // Continue even if we can't get package info
      }

      const result = await client.composePackageDownloadLink({ packageId });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                packageId,
                name: packageInfo.name ?? "(unknown)",
                downloadLink: result.downloadLink,
                note: "This link is temporary and will expire. Download promptly.",
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
