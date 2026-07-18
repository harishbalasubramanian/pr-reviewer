// Unified diff parser.
// Takes a raw patch string (from GitHub's PR files API) and returns structured hunks.

export type DiffLineType = "added" | "removed" | "context";

export interface DiffLine {
  type: DiffLineType;
  content: string;           // line text without the leading +/-/space prefix
  oldLineNumber: number | null; // null for added-only lines
  newLineNumber: number | null; // null for removed-only lines
}

export interface DiffHunk {
  header: string;  // e.g. "@@ -1,7 +1,6 @@"
  lines: DiffLine[];
}

// Matches: @@ -<old>,<count> +<new>,<count> @@
const HUNK_HEADER_RE = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

export function parsePatch(patch: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (const raw of patch.split("\n")) {
    const hunkMatch = raw.match(HUNK_HEADER_RE);
    if (hunkMatch) {
      currentHunk = { header: raw, lines: [] };
      hunks.push(currentHunk);
      oldLine = parseInt(hunkMatch[1], 10);
      newLine = parseInt(hunkMatch[2], 10);
      continue;
    }

    if (!currentHunk) continue;

    if (raw.startsWith("+")) {
      currentHunk.lines.push({
        type: "added",
        content: raw.slice(1),
        oldLineNumber: null,
        newLineNumber: newLine++,
      });
    } else if (raw.startsWith("-")) {
      currentHunk.lines.push({
        type: "removed",
        content: raw.slice(1),
        oldLineNumber: oldLine++,
        newLineNumber: null,
      });
    } else if (raw.startsWith(" ") || raw === "") {
      // Empty string can appear at the end of a patch; treat as context.
      currentHunk.lines.push({
        type: "context",
        content: raw.startsWith(" ") ? raw.slice(1) : raw,
        oldLineNumber: oldLine++,
        newLineNumber: newLine++,
      });
    }
    // Lines starting with "\" ("No newline at end of file") are intentionally skipped.
  }

  return hunks;
}
