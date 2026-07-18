"use client";

import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
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

function NonMarkdownPanel({ file }: { file: GitHubPRFile }) {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace", mb: 1.5 }}>
        {file.filename}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        This file type is not rendered in-app.
      </Typography>
      <Link
        href={file.blob_url}
        target="_blank"
        rel="noopener noreferrer"
        underline="hover"
        sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontSize: "0.875rem" }}
      >
        View on GitHub
        <OpenInNewIcon sx={{ fontSize: 14 }} />
      </Link>
    </Box>
  );
}

function MarkdownPlaceholderPanel({ file }: { file: GitHubPRFile }) {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace", mb: 1.5 }}>
        {file.filename}
      </Typography>
      {/* Diff renderer replaces this placeholder in PR 4. */}
      <Box
        sx={{
          border: "1px dashed",
          borderColor: "divider",
          borderRadius: 2,
          p: 4,
          textAlign: "center",
          color: "text.secondary",
        }}
      >
        <Typography variant="body2">Diff viewer coming in PR 4.</Typography>
      </Box>
    </Box>
  );
}

export default function FilePanel({ file }: FilePanelProps) {
  if (!file) return <EmptyState />;
  if (!isMarkdownFile(file.filename)) return <NonMarkdownPanel file={file} />;
  return <MarkdownPlaceholderPanel file={file} />;
}
