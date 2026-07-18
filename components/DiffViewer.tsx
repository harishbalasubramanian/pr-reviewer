"use client";

import type { ExtraProps } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { parsePatch, type DiffLine, type DiffHunk } from "@/lib/diff";
import type { GitHubPRFile } from "@/types/github";

// Suppress react-markdown's default <p> wrapper so inline content stays on one row.
// react-markdown passes HTMLAttributes + ExtraProps to custom components.
const markdownComponents = {
  p: ({ children }: React.HTMLAttributes<HTMLParagraphElement> & ExtraProps) => (
    <span>{children}</span>
  ),
};

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {content}
    </ReactMarkdown>
  );
}

// Fixed-width columns for line numbers — mirrors GitHub's diff table layout.
const LINE_NUM_WIDTH = 48;
const INDICATOR_WIDTH = 24;

const LINE_STYLES: Record<DiffLine["type"], object> = {
  added: { bgcolor: "rgba(35, 134, 54, 0.15)" },
  removed: { bgcolor: "rgba(248, 81, 73, 0.15)", textDecoration: "line-through" },
  context: {},
};

const INDICATOR_COLORS: Record<DiffLine["type"], string> = {
  added: "success.main",
  removed: "error.main",
  context: "text.disabled",
};

const INDICATOR_CHAR: Record<DiffLine["type"], string> = {
  added: "+",
  removed: "-",
  context: " ",
};

function LineNumber({ n }: { n: number | null }) {
  return (
    <Box
      sx={{
        width: LINE_NUM_WIDTH,
        flexShrink: 0,
        textAlign: "right",
        pr: 1,
        color: "text.disabled",
        fontFamily: "monospace",
        fontSize: "0.75rem",
        userSelect: "none",
      }}
    >
      {n ?? ""}
    </Box>
  );
}

function HunkHeader({ header }: { header: string }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        px: 1,
        py: 0.5,
        bgcolor: "rgba(84, 174, 255, 0.1)",
        borderTop: "1px solid",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontFamily: "monospace", color: "text.secondary" }}
      >
        {header}
      </Typography>
    </Box>
  );
}

function DiffRow({ line }: { line: DiffLine }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "baseline",
        minHeight: 24,
        ...LINE_STYLES[line.type],
        "&:hover": { filter: "brightness(0.97)" },
      }}
    >
      <LineNumber n={line.oldLineNumber} />
      <LineNumber n={line.newLineNumber} />

      <Box
        sx={{
          width: INDICATOR_WIDTH,
          flexShrink: 0,
          textAlign: "center",
          color: INDICATOR_COLORS[line.type],
          fontFamily: "monospace",
          fontSize: "0.8rem",
          userSelect: "none",
        }}
      >
        {INDICATOR_CHAR[line.type]}
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          fontFamily: "monospace",
          fontSize: "0.8rem",
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          pr: 2,
          "& code": { fontSize: "0.75rem" },
        }}
      >
        <MarkdownContent content={line.content} />
      </Box>
    </Box>
  );
}

function Hunk({ hunk }: { hunk: DiffHunk }) {
  return (
    <Box>
      <HunkHeader header={hunk.header} />
      {hunk.lines.map((line, i) => (
        <DiffRow key={i} line={line} />
      ))}
    </Box>
  );
}

function NoPatchAvailable({ file }: { file: GitHubPRFile }) {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Diff not available for this file (binary or too large).
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

export default function DiffViewer({ file }: { file: GitHubPRFile }) {
  if (!file.patch) {
    return <NoPatchAvailable file={file} />;
  }

  const hunks = parsePatch(file.patch);

  return (
    <Box sx={{ overflow: "auto" }}>
      {/* File header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          px: 2,
          py: 1,
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          position: "sticky",
          top: 0,
          zIndex: 1,
        }}
      >
        <Typography
          variant="caption"
          sx={{ fontFamily: "monospace", color: "text.primary", fontWeight: 600, flexGrow: 1 }}
        >
          {file.filename}
        </Typography>
        <Typography variant="caption" sx={{ color: "success.main", fontWeight: 600 }}>
          +{file.additions}
        </Typography>
        <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
          -{file.deletions}
        </Typography>
      </Box>

      {/* Hunks */}
      <Box sx={{ fontSize: "0.8rem" }}>
        {hunks.map((hunk, i) => (
          <Hunk key={i} hunk={hunk} />
        ))}
      </Box>
    </Box>
  );
}
