#!/usr/bin/env node
/**
 * Script to add MCP tool annotations to all tool files.
 *
 * Usage: node scripts/add-annotations.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toolsDir = path.join(__dirname, '..', 'src', 'tools');

// Annotation rules based on tool name prefix
function getAnnotations(toolName) {
  // All tools talk to external Cognigy API
  const base = { openWorldHint: true };

  // Read-only tools
  if (/^(list|get|read|search|audit|export|diff|score)_/.test(toolName)) {
    return { ...base, readOnlyHint: true, destructiveHint: false, idempotentHint: true };
  }

  // Destructive tools
  if (/^(delete|remove)_/.test(toolName)) {
    return { ...base, readOnlyHint: false, destructiveHint: true, idempotentHint: true };
  }

  // Idempotent mutating tools
  if (/^(update|set|reset)_/.test(toolName)) {
    return { ...base, readOnlyHint: false, destructiveHint: false, idempotentHint: true };
  }

  // Non-idempotent mutating tools
  if (/^(create|clone|deploy|restore|train|run|trigger|generate|upload|inject|merge|unmerge|move|package|promote|stop|test)_/.test(toolName)) {
    return { ...base, readOnlyHint: false, destructiveHint: false, idempotentHint: false };
  }

  // Default for unknown patterns
  console.warn(`Unknown tool pattern: ${toolName}`);
  return { ...base, readOnlyHint: false, destructiveHint: false, idempotentHint: false };
}

function formatAnnotations(annotations) {
  const parts = [];
  if (annotations.readOnlyHint !== undefined) parts.push(`readOnlyHint: ${annotations.readOnlyHint}`);
  if (annotations.destructiveHint !== undefined) parts.push(`destructiveHint: ${annotations.destructiveHint}`);
  if (annotations.idempotentHint !== undefined) parts.push(`idempotentHint: ${annotations.idempotentHint}`);
  if (annotations.openWorldHint !== undefined) parts.push(`openWorldHint: ${annotations.openWorldHint}`);
  return `{ ${parts.join(', ')} }`;
}

async function processFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const fileName = path.basename(filePath);

  // Skip index.ts and non-tool files
  if (fileName === 'index.ts' || !fileName.endsWith('.ts')) {
    return { file: fileName, status: 'skipped' };
  }

  // Extract tool name from server.tool() call
  const toolNameMatch = content.match(/server\.tool\(\s*["']([^"']+)["']/);
  if (!toolNameMatch) {
    return { file: fileName, status: 'no-tool-found' };
  }

  const toolName = toolNameMatch[1];

  // Check if annotations already exist
  if (content.includes('readOnlyHint') || content.includes('destructiveHint')) {
    return { file: fileName, status: 'already-has-annotations', toolName };
  }

  const annotations = getAnnotations(toolName);
  const annotationsStr = formatAnnotations(annotations);

  // Pattern to match: server.tool("name", "description", inputSchema.shape, async (args) => {
  // We need to insert annotations before the async callback

  // Match the server.tool call up to just before the callback
  const pattern = /(server\.tool\(\s*["'][^"']+["'],\s*["'][^"']*["'],\s*inputSchema\.shape,)(\s*async\s*\()/;

  if (!pattern.test(content)) {
    // Try alternative pattern without description
    const altPattern = /(server\.tool\(\s*["'][^"']+["'],\s*inputSchema\.shape,)(\s*async\s*\()/;
    if (!altPattern.test(content)) {
      return { file: fileName, status: 'pattern-not-matched', toolName };
    }
    const newContent = content.replace(altPattern, `$1\n    ${annotationsStr},\n    $2`);
    await fs.writeFile(filePath, newContent, 'utf-8');
    return { file: fileName, status: 'updated', toolName, annotations };
  }

  const newContent = content.replace(pattern, `$1\n    ${annotationsStr},$2`);
  await fs.writeFile(filePath, newContent, 'utf-8');
  return { file: fileName, status: 'updated', toolName, annotations };
}

async function main() {
  const files = await fs.readdir(toolsDir);
  const results = [];

  for (const file of files) {
    if (!file.endsWith('.ts')) continue;
    const filePath = path.join(toolsDir, file);
    const result = await processFile(filePath);
    results.push(result);
  }

  // Summary
  const updated = results.filter(r => r.status === 'updated');
  const skipped = results.filter(r => r.status === 'skipped');
  const notMatched = results.filter(r => r.status === 'pattern-not-matched');
  const alreadyHas = results.filter(r => r.status === 'already-has-annotations');

  console.log('\n=== Summary ===');
  console.log(`Updated: ${updated.length}`);
  console.log(`Skipped: ${skipped.length}`);
  console.log(`Already has annotations: ${alreadyHas.length}`);
  console.log(`Pattern not matched: ${notMatched.length}`);

  if (notMatched.length > 0) {
    console.log('\nFiles that need manual review:');
    notMatched.forEach(r => console.log(`  - ${r.file} (${r.toolName})`));
  }

  // Count by annotation type
  const byType = {
    readOnly: updated.filter(r => r.annotations?.readOnlyHint).length,
    destructive: updated.filter(r => r.annotations?.destructiveHint).length,
    idempotent: updated.filter(r => r.annotations?.idempotentHint).length,
    nonIdempotent: updated.filter(r => r.annotations && !r.annotations.idempotentHint).length,
  };

  console.log('\nAnnotation counts:');
  console.log(`  Read-only: ${byType.readOnly}`);
  console.log(`  Destructive: ${byType.destructive}`);
  console.log(`  Idempotent: ${byType.idempotent}`);
  console.log(`  Non-idempotent: ${byType.nonIdempotent}`);
}

main().catch(console.error);
