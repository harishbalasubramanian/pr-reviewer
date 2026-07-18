"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import DiffViewer from "@/components/DiffViewer";
import { getFileLanguage } from "@/lib/fileLanguage";
import { isMarkdownFile } from "@/lib/github";
import type { GitHubPRFile } from "@/types/github";

interface FilePanelProps {
  file: GitHubPRFile | null;
}

function EmptyState() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "text.secondary",
      }}
    >
      <Typography variant="body2">Select a file to review it.</Typography>
    </Box>
  );
}

// Resolve the language to pass to DiffViewer:
// - Markdown files get null (DiffViewer uses react-markdown for those).
// - Code files get the highlight.js language string (or null if unknown).
function resolveLanguage(file: GitHubPRFile): string | null {
  if (isMarkdownFile(file.filename)) return null;
  return getFileLanguage(file.filename);
}

export default function FilePanel({ file }: FilePanelProps) {
  if (!file) return <EmptyState />;

  // All files — markdown and code — go through DiffViewer.
  // DiffViewer handles the no-patch fallback (binary/oversized) internally.
  return <DiffViewer file={file} language={resolveLanguage(file)} />;
}
