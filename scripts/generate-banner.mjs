/**
 * Generates the README banner image.
 * Creates an SVG at 1280x640 and rasterizes to PNG.
 */

import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, '..', 'docs', 'banner.png');

// Design constants matching mcpward's dark theme
const WIDTH = 1280;
const HEIGHT = 640;
const BG_COLOR = '#0d1117'; // GitHub dark background
const ACCENT_COLOR = '#58a6ff'; // GitHub blue accent
const TEXT_COLOR = '#f0f6fc'; // Light text
const MUTED_COLOR = '#8b949e'; // Muted text
const DOMAIN_BG = '#21262d'; // Domain pill background

// Domain labels showing breadth
const domains = ['Flows', 'NLU', 'Snapshots', 'Knowledge AI', 'LLMs', 'Deployment'];

// Build the SVG
const svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="100%" height="100%" fill="${BG_COLOR}"/>

  <!-- Subtle grid pattern for depth -->
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#21262d" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)" opacity="0.5"/>

  <!-- Accent glow at top -->
  <ellipse cx="640" cy="0" rx="600" ry="200" fill="${ACCENT_COLOR}" opacity="0.08"/>

  <!-- Main title (large, monospace) -->
  <text x="640" y="220"
        font-family="'SF Mono', 'Fira Code', 'Consolas', monospace"
        font-size="72"
        font-weight="700"
        fill="${TEXT_COLOR}"
        text-anchor="middle">
    Cognigy MCP
  </text>

  <!-- Full package name (smaller) -->
  <text x="640" y="280"
        font-family="'SF Mono', 'Fira Code', 'Consolas', monospace"
        font-size="24"
        fill="${MUTED_COLOR}"
        text-anchor="middle">
    cognigy-ai-mcp-management-server
  </text>

  <!-- Tagline -->
  <text x="640" y="360"
        font-family="-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="32"
        fill="${TEXT_COLOR}"
        text-anchor="middle">
    132 tools to manage Cognigy.AI from your AI assistant
  </text>

  <!-- Domain pills row -->
  <g transform="translate(640, 460)">
    ${domains.map((domain, i) => {
      const pillWidth = domain.length * 14 + 32;
      const totalWidth = domains.reduce((sum, d) => sum + d.length * 14 + 32 + 16, -16);
      let xOffset = -totalWidth / 2;
      for (let j = 0; j < i; j++) {
        xOffset += domains[j].length * 14 + 32 + 16;
      }
      return `
        <rect x="${xOffset}" y="-20" width="${pillWidth}" height="40" rx="20" fill="${DOMAIN_BG}"/>
        <text x="${xOffset + pillWidth/2}" y="6"
              font-family="-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
              font-size="18"
              fill="${ACCENT_COLOR}"
              text-anchor="middle">
          ${domain}
        </text>
      `;
    }).join('')}
  </g>

  <!-- Bottom accent line -->
  <rect x="440" y="540" width="400" height="3" rx="1.5" fill="${ACCENT_COLOR}" opacity="0.6"/>

  <!-- MCP badge -->
  <text x="640" y="590"
        font-family="-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="16"
        fill="${MUTED_COLOR}"
        text-anchor="middle">
    Built with Model Context Protocol
  </text>
</svg>`;

// Convert SVG to PNG
async function generateBanner() {
  try {
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`Banner generated: ${outputPath}`);

    // Verify dimensions
    const metadata = await sharp(outputPath).metadata();
    console.log(`Dimensions: ${metadata.width}x${metadata.height}`);

    // Generate 400px thumbnail for readability test
    const thumbPath = join(__dirname, '..', 'docs', 'banner-thumb.png');
    await sharp(outputPath)
      .resize(400)
      .toFile(thumbPath);
    console.log(`Thumbnail generated: ${thumbPath} (for readability verification)`);

  } catch (error) {
    console.error('Failed to generate banner:', error);
    process.exit(1);
  }
}

generateBanner();
