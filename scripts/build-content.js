#!/usr/bin/env node
// Reads content/ folder, outputs content.js as a global CONTENT object.
// Run: node scripts/build-content.js
const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'content');
const OUTPUT      = path.join(__dirname, '..', 'content.js');
const TEXT_EXTS   = new Set(['.md', '.txt', '.asc']);

function toCamelCase(str) {
  return str.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function walk(dir) {
  const result = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result[toCamelCase(entry.name)] = walk(full);
    } else {
      const ext  = path.extname(entry.name);
      const base = path.basename(entry.name, ext);
      if (TEXT_EXTS.has(ext)) {
        result[toCamelCase(base)] = fs.readFileSync(full, 'utf8');
      }
    }
  }
  return result;
}

const content = walk(CONTENT_DIR);
const output  = [
  '// AUTO-GENERATED — do not edit manually. Run: node scripts/build-content.js',
  `const CONTENT = ${JSON.stringify(content, null, 2)};`,
].join('\n') + '\n';

fs.writeFileSync(OUTPUT, output);
console.log('content.js written (' + Buffer.byteLength(output) + ' bytes)');
