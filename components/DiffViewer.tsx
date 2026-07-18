"use client";

import "highlight.js/styles/github.css";

import hljs from "highlight.js/lib/common";
import type { ExtraProps } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { parsePatch, type DiffLine, type DiffHunk } from "@/lib/diff";
import { isMarkdownFile } from "@/lib/github";
import type { GitHubPRFile } from "@/types/github";

// --- Content renderers ---

// Suppress react-markdown's default <p> wrapper so inline content stays on one row.
// react-markdown passes HTMLAttributes + ExtraProps to custom components.
const markdownComponents = {
  p: ({ children }: React.HTMLAttributes<HTMLParagraphElement> & ExtraProps) => (
    <span>{children}</span>
  ),
};

function MarkdownLineContent({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {content}
    </ReactMarkdown>
  );
}

// Renders a single line of code with highlight.js syntax highlighting.
// Per-line highlighting has a known limitation: multi-line constructs (block comments,
// template literals) may not be correctly colored. Acceptable for a diff viewer.
function CodeLineContent({
  content,
  language,
}: {
  content: string;
  language: string | null;
}) {
  if (!language || !hljs.getLanguage(language)) {
    // Unknown language — render plain monospace.
    return <>{content}</>;
  }

  const highlighted = hljs.highlight(content, { language, ignoreIllegals: true });

  return (
    <span
      className="hljs"
      // highlight.js returns safe escaped HTML — dangerouslySetInnerHTML is the
      // standard pattern for embedding its output in React.
      dangerouslySetInnerHTML={{ __html: highlighted.value }}
    />
  );
}

// --- Layout constants & style maps ---

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

// --- Sub-components ---

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
      <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>
        {header}
      </Typography>
    </Box>
  );
}

function DiffRow({
  line,
  isMarkdown,
  language,
}: {
  line: DiffLine;
  isMarkdown: boolean;
  language: string | null;
}) {
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
          // The hljs GitHub theme sets background: white on .hljs — clear it so
          // the diff row's green/red background isn't obscured.
          "& .hljs": { background: "transparent" },
        }}
      >
        {isMarkdown ? (
          <MarkdownLineContent content={line.content} />
        ) : (
          <CodeLineContent content={line.content} language={language} />
        )}
      </Box>
    </Box>
  );
}

function Hunk({
  hunk,
  isMarkdown,
  language,
}: {
  hunk: DiffHunk;
  isMarkdown: boolean;
  language: string | null;
}) {
  return (
    <Box>
      <HunkHeader header={hunk.header} />
      {hunk.lines.map((line, i) => (
        <DiffRow key={i} line={line} isMarkdown={isMarkdown} language={language} />
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

// --- Main component ---

interface DiffViewerProps {
  file: GitHubPRFile;
  // Highlight.js language string for syntax highlighting, or null for plain text.
  language: string | null;
}

export default function DiffViewer({ file, language }: DiffViewerProps) {
  if (!file.patch) {
    return <NoPatchAvailable file={file} />;
  }

  const hunks = parsePatch(file.patch);
  const markdown = isMarkdownFile(file.filename);

  return (
    <Box sx={{ overflow: "auto" }}>
      {/* Sticky file header */}
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

      <Box sx={{ fontSize: "0.8rem" }}>
        {hunks.map((hunk, i) => (
          <Hunk key={i} hunk={hunk} isMarkdown={markdown} language={language} />
        ))}
      </Box>
    </Box>
  );
}
