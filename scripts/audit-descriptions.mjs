#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toolsDir = path.join(__dirname, '..', 'src', 'tools');

const files = fs.readdirSync(toolsDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');

const results = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(toolsDir, file), 'utf-8');

  // Match server.tool('name', 'description', ...)
  const match = content.match(/server\.tool\(\s*["']([^"']+)["'],\s*["']([^"']+)["']/);

  if (match) {
    results.push({
      tool: match[1],
      description: match[2],
      length: match[2].length,
      file
    });
  }
}

// Sort by description length (shortest first - likely weakest)
results.sort((a, b) => a.length - b.length);

console.log('\n=== Shortest descriptions (potentially weakest) ===\n');
console.log('| # | Tool | Len | Description |');
console.log('|---|------|-----|-------------|');
results.slice(0, 20).forEach((r, i) => {
  const desc = r.description.length > 100 ? r.description.slice(0, 97) + '...' : r.description;
  console.log(`| ${i+1} | ${r.tool} | ${r.length} | ${desc} |`);
});

console.log('\n=== Statistics ===');
console.log(`Total tools: ${results.length}`);
console.log(`Avg description length: ${Math.round(results.reduce((a,b) => a + b.length, 0) / results.length)}`);
console.log(`Min: ${results[0]?.length}, Max: ${results[results.length-1]?.length}`);

// Find descriptions without key info
console.log('\n=== Potential issues ===');
const issues = results.filter(r => {
  const d = r.description.toLowerCase();
  // Missing action verb at start
  const hasVerb = /^(lists?|gets?|creates?|updates?|deletes?|removes?|searches?|scores?|runs?|trains?|uploads?|restores?|clones?|merges?|triggers?|stops?|tests?|sets?|exports?|injects?|resets?|moves?|generates?|packages?|promotes?|diffs?)/i.test(r.description);
  // Too short
  const tooShort = r.length < 80;
  // Missing "Cognigy" context
  const hasCognigy = d.includes('cognigy');

  return !hasVerb || tooShort || !hasCognigy;
});

issues.slice(0, 15).forEach(r => {
  const reasons = [];
  if (r.length < 80) reasons.push('short');
  if (!/^(lists?|gets?|creates?|updates?|deletes?|removes?|searches?|scores?|runs?|trains?|uploads?|restores?|clones?|merges?|triggers?|stops?|tests?|sets?|exports?|injects?|resets?|moves?|generates?|packages?|promotes?|diffs?)/i.test(r.description)) reasons.push('no-verb');
  if (!r.description.toLowerCase().includes('cognigy')) reasons.push('no-cognigy');
  console.log(`- ${r.tool}: [${reasons.join(', ')}] "${r.description.slice(0, 60)}..."`);
});
