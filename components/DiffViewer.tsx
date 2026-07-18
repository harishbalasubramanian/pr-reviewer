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
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import Badge from "@mui/material/Badge";
import { parsePatch, type DiffLine } from "@/lib/diff";
import { isMarkdownFile } from "@/lib/github";
import type { GitHubPRFile, GitHubPRComment, CommentSelectionRange } from "@/types/github";

// --- Content renderers ---

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

function CodeLineContent({
  content,
  language,
}: {
  content: string;
  language: string | null;
}) {
  if (!language || !hljs.getLanguage(language)) {
    return <>{content}</>;
  }

  const highlighted = hljs.highlight(content, { language, ignoreIllegals: true });

  return (
    <span
      className="hljs"
      dangerouslySetInnerHTML={{ __html: highlighted.value }}
    />
  );
}

// --- Layout constants & style maps ---

const LINE_NUM_WIDTH = 48;
const INDICATOR_WIDTH = 24;

const LINE_STYLES: Record<DiffLine["type"], { bgcolor?: string; textDecoration?: string }> = {
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

interface DiffRowProps {
  line: DiffLine;
  isMarkdown: boolean;
  language: string | null;
  index: number;
  path: string;
  selectedRange: CommentSelectionRange | null;
  onSelectRange: (range: CommentSelectionRange | null) => void;
  comments: GitHubPRComment[];
  onSelectCommentThread: (comment: GitHubPRComment) => void;
}

function DiffRow({
  line,
  isMarkdown,
  language,
  index,
  path,
  selectedRange,
  onSelectRange,
  comments,
  onSelectCommentThread,
}: DiffRowProps) {
  const side = line.type === "removed" ? "LEFT" : "RIGHT";
  const lineNumber = side === "LEFT" ? line.oldLineNumber : line.newLineNumber;

  // Check if this row is selected
  const isSelected =
    selectedRange &&
    selectedRange.path === path &&
    index >= selectedRange.startIndex &&
    index <= selectedRange.endIndex;

  // Filter comments for this specific line
  const rowComments = lineNumber
    ? comments.filter(
        (c) =>
          c.path === path &&
          c.line === lineNumber &&
          c.side === side
      )
    : [];

  const rowId = lineNumber ? `diff-row-${side.toLowerCase()}-${lineNumber}` : undefined;

  const bgStyle = isSelected
    ? "rgba(25, 118, 210, 0.12)"
    : LINE_STYLES[line.type].bgcolor || "transparent";

  return (
    <Box
      id={rowId}
      className="diff-row"
      data-index={index}
      data-line={lineNumber || ""}
      data-side={side}
      data-path={path}
      sx={{
        display: "flex",
        alignItems: "baseline",
        minHeight: 24,
        bgcolor: bgStyle,
        textDecoration: LINE_STYLES[line.type].textDecoration,
        transition: "background-color 0.15s ease",
        "&:hover": { filter: "brightness(0.97)" },
      }}
    >
      <LineNumber n={line.oldLineNumber} />
      <LineNumber n={line.newLineNumber} />

      {/* Indicator with Hover "+" comment trigger */}
      <Box
        sx={{
          width: INDICATOR_WIDTH,
          flexShrink: 0,
          textAlign: "center",
          color: INDICATOR_COLORS[line.type],
          fontFamily: "monospace",
          fontSize: "0.8rem",
          userSelect: "none",
          position: "relative",
          cursor: "pointer",
          "&:hover .add-comment-btn": {
            display: "inline-flex",
          },
          "&:hover .indicator-char": {
            display: "none",
          },
        }}
        onClick={() => {
          if (!lineNumber) return;
          onSelectRange({
            path,
            line: lineNumber,
            side,
            start_line: null,
            start_side: null,
            startIndex: index,
            endIndex: index,
          });
        }}
      >
        <span className="indicator-char">{INDICATOR_CHAR[line.type]}</span>
        <Box
          className="add-comment-btn"
          sx={{
            display: "none",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "primary.main",
            color: "primary.contrastText",
            borderRadius: 0.5,
            fontSize: "0.75rem",
          }}
        >
          +
        </Box>
      </Box>

      {/* Line Content */}
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
          "& .hljs": { background: "transparent" },
        }}
      >
        {isMarkdown ? (
          <MarkdownLineContent content={line.content} />
        ) : (
          <CodeLineContent content={line.content} language={language} />
        )}
      </Box>

      {/* Comment Badge indicator */}
      {rowComments.length > 0 && (
        <Box
          onClick={(e) => {
            e.stopPropagation();
            onSelectCommentThread(rowComments[0]);
          }}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            cursor: "pointer",
            color: "primary.main",
            opacity: 0.8,
            "&:hover": { opacity: 1 },
            ml: 1,
            mr: 2,
            alignSelf: "center",
          }}
        >
          <Badge
            badgeContent={rowComments.length}
            color="primary"
            slotProps={{
              badge: {
                style: {
                  fontSize: "0.65rem",
                  height: 16,
                  minWidth: 16,
                  lineHeight: "16px",
                },
              },
            }}
          >
            <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />
          </Badge>
        </Box>
      )}
    </Box>
  );
}

function Hunk({
  hunk,
  isMarkdown,
  language,
  path,
  selectedRange,
  onSelectRange,
  comments,
  onSelectCommentThread,
}: {
  hunk: { header: string; lines: { line: DiffLine; index: number }[] };
  isMarkdown: boolean;
  language: string | null;
  path: string;
  selectedRange: CommentSelectionRange | null;
  onSelectRange: (range: CommentSelectionRange | null) => void;
  comments: GitHubPRComment[];
  onSelectCommentThread: (comment: GitHubPRComment) => void;
}) {
  return (
    <Box>
      <HunkHeader header={hunk.header} />
      {hunk.lines.map(({ line, index }) => (
        <DiffRow
          key={index}
          index={index}
          line={line}
          isMarkdown={isMarkdown}
          language={language}
          path={path}
          selectedRange={selectedRange}
          onSelectRange={onSelectRange}
          comments={comments}
          onSelectCommentThread={onSelectCommentThread}
        />
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
  language: string | null;
  selectedRange: CommentSelectionRange | null;
  onSelectRange: (range: CommentSelectionRange | null) => void;
  comments: GitHubPRComment[];
  onSelectCommentThread: (comment: GitHubPRComment) => void;
}

export default function DiffViewer({
  file,
  language,
  selectedRange,
  onSelectRange,
  comments,
  onSelectCommentThread,
}: DiffViewerProps) {
  if (!file.patch) {
    return <NoPatchAvailable file={file} />;
  }

  const hunks = parsePatch(file.patch);
  const markdown = isMarkdownFile(file.filename);

  // Pre-calculate indices sequentially across all hunks
  let globalLineIndex = 0;
  const hunksWithIndices = hunks.map((hunk) => {
    const linesWithIndices = hunk.lines.map((line) => {
      const index = globalLineIndex;
      globalLineIndex++;
      return { line, index };
    });
    return { ...hunk, lines: linesWithIndices };
  });

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const anchor = selection.anchorNode;
    const focus = selection.focusNode;
    if (!anchor || !focus) return;

    const anchorRow = anchor.parentElement?.closest(".diff-row") as HTMLElement | null;
    const focusRow = focus.parentElement?.closest(".diff-row") as HTMLElement | null;

    if (!anchorRow || !focusRow) return;

    const anchorIndex = parseInt(anchorRow.getAttribute("data-index") || "", 10);
    const focusIndex = parseInt(focusRow.getAttribute("data-index") || "", 10);

    if (isNaN(anchorIndex) || isNaN(focusIndex)) return;

    const startIndex = Math.min(anchorIndex, focusIndex);
    const endIndex = Math.max(anchorIndex, focusIndex);

    const startEl = startIndex === anchorIndex ? anchorRow : focusRow;
    const endEl = endIndex === anchorIndex ? anchorRow : focusRow;

    const startLine = parseInt(startEl.getAttribute("data-line") || "", 10);
    const startSide = startEl.getAttribute("data-side") as "LEFT" | "RIGHT";
    const endLine = parseInt(endEl.getAttribute("data-line") || "", 10);
    const endSide = endEl.getAttribute("data-side") as "LEFT" | "RIGHT";
    const path = startEl.getAttribute("data-path") || "";

    if (isNaN(startLine) || isNaN(endLine)) return;

    onSelectRange({
      path,
      line: endLine,
      side: endSide,
      start_line: startIndex !== endIndex ? startLine : null,
      start_side: startIndex !== endIndex ? startSide : null,
      startIndex,
      endIndex,
    });
  };

  return (
    <Box sx={{ overflow: "auto" }} onMouseUp={handleMouseUp}>
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
        {hunksWithIndices.map((hunk, i) => (
          <Hunk
            key={i}
            hunk={hunk}
            isMarkdown={markdown}
            language={language}
            path={file.filename}
            selectedRange={selectedRange}
            onSelectRange={onSelectRange}
            comments={comments}
            onSelectCommentThread={onSelectCommentThread}
          />
        ))}
      </Box>
    </Box>
  );
}
