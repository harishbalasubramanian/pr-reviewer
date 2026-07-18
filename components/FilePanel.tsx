"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import DiffViewer from "@/components/DiffViewer";
import { getFileLanguage } from "@/lib/fileLanguage";
import { isMarkdownFile } from "@/lib/github";
import type { GitHubPRFile, GitHubPRComment, CommentSelectionRange } from "@/types/github";

interface FilePanelProps {
  file: GitHubPRFile | null;
  selectedRange: CommentSelectionRange | null;
  onSelectRange: (range: CommentSelectionRange | null) => void;
  comments: GitHubPRComment[];
  onSelectCommentThread: (comment: GitHubPRComment) => void;
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

function resolveLanguage(file: GitHubPRFile): string | null {
  if (isMarkdownFile(file.filename)) return null;
  return getFileLanguage(file.filename);
}

export default function FilePanel({
  file,
  selectedRange,
  onSelectRange,
  comments,
  onSelectCommentThread,
}: FilePanelProps) {
  if (!file) return <EmptyState />;

  return (
    <DiffViewer
      file={file}
      language={resolveLanguage(file)}
      selectedRange={selectedRange}
      onSelectRange={onSelectRange}
      comments={comments}
      onSelectCommentThread={onSelectCommentThread}
    />
  );
}
