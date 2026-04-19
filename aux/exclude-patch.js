#!/usr/bin/env node
/**
 * exclude-patch.js
 *
 * Reads a unified diff from stdin.
 * Exits with status 0 if and only if every changed line pair is solely
 * a replacement of one or more commit hashes (7-40 hex chars, at word
 * boundaries) and nothing else differs between the removed (-) and
 * added (+) lines.
 *
 * "Only hash replacements" means:
 *   - Each removed line has a corresponding added line (1-to-1 pairing).
 *   - When you replace every hash in both lines with the same placeholder,
 *     the resulting strings are identical.
 *   - Hunk header changes (@@ … @@) and context lines are ignored.
 *   - File header lines (---, +++) are ignored.
 *   - Pure additions or pure deletions (unpaired) are NOT allowed.
 */

'use strict';

const readline = require('readline');

const HASH_RE = /\b[0-9a-f]{7,40}\b/g;

function normalizeHashes(line) {
  return line.replace(HASH_RE, '<HASH>');
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

  const removedLines = [];
  const addedLines = [];

  for await (const raw of rl) {
    const line = raw;

    // Skip diff headers and hunk markers
    if (
      line.startsWith('--- ') ||
      line.startsWith('+++ ') ||
      line.startsWith('diff ') ||
      line.startsWith('index ') ||
      line.startsWith('new file') ||
      line.startsWith('deleted file') ||
      line.startsWith('old mode') ||
      line.startsWith('new mode') ||
      line.startsWith('\\ No newline') ||
      line.startsWith('@@ ')
    ) {
      // When we hit a new hunk, flush any pending changes
      if (line.startsWith('@@ ')) {
        if (!flushHunk(removedLines, addedLines)) {
          process.exit(1);
        }
        removedLines.length = 0;
        addedLines.length = 0;
      }
      continue;
    }

    if (line.startsWith('-')) {
      removedLines.push(line.slice(1));
    } else if (line.startsWith('+')) {
      addedLines.push(line.slice(1));
    } else {
      // Context line: flush accumulated changes first
      if (!flushHunk(removedLines, addedLines)) {
        process.exit(1);
      }
      removedLines.length = 0;
      addedLines.length = 0;
    }
  }

  // Flush remaining
  if (!flushHunk(removedLines, addedLines)) {
    process.exit(1);
  }

  process.exit(0);
}

/**
 * Returns true iff every removed/added line pair differs only in hashes.
 * Unpaired lines (different counts) immediately return false.
 */
function flushHunk(removed, added) {
  if (removed.length === 0 && added.length === 0) return true;

  // Unpaired lines = structural change
  if (removed.length !== added.length) return false;

  for (let i = 0; i < removed.length; i++) {
    const normRemoved = normalizeHashes(removed[i]);
    const normAdded = normalizeHashes(added[i]);
    if (normRemoved !== normAdded) return false;
  }

  return true;
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
