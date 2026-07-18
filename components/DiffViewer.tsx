"use client";

import "highlight.js/styles/github.css";

import { useState } from "react";
import hljs from "highlight.js/lib/common";
import type { ExtraProps } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
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

interface InlineCommentCardProps {
  comment: GitHubPRComment;
  currentUserLogin: string;
  onEdit: (commentId: number, body: string) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
}

function InlineCommentCard({ comment, currentUserLogin, onEdit, onDelete }: InlineCommentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (!editBody.trim()) return;
    setSubmitting(true);
    try {
      await onEdit(comment.id, editBody);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const isOwner = comment.user.login === currentUserLogin;

  return (
    <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
      <Avatar src={comment.user.avatar_url} alt={comment.user.login} sx={{ width: 24, height: 24 }} />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="caption" fontWeight={600} noWrap>
            {comment.user.login}
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem" }}>
            {new Date(comment.created_at).toLocaleDateString()}
          </Typography>
          {isOwner && !isEditing && (
            <Box sx={{ ml: "auto", display: "flex", gap: 0.25 }}>
              <IconButton size="small" onClick={() => setIsEditing(true)} sx={{ p: 0.25 }}>
                <EditIcon sx={{ fontSize: 12 }} />
              </IconButton>
              <IconButton size="small" onClick={() => onDelete(comment.id)} sx={{ p: 0.25, color: "error.main" }}>
                <DeleteIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Box>
          )}
        </Box>

        {isEditing ? (
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              size="small"
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              disabled={submitting}
              sx={{ "& .MuiInputBase-root": { fontSize: "0.75rem" } }}
            />
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5, mt: 0.5 }}>
              <IconButton size="small" onClick={() => setIsEditing(false)} disabled={submitting}>
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
              <IconButton size="small" color="primary" onClick={handleSave} disabled={submitting || !editBody.trim()}>
                <CheckIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          </Box>
        ) : (
          <Box sx={{ fontSize: "0.75rem", mt: 0.5, "& p": { m: 0 } }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {comment.body}
            </ReactMarkdown>
          </Box>
        )}
      </Box>
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
  currentUserLogin: string;
  onPostComment: (payload: {
    body: string;
    path?: string;
    line?: number;
    side?: "LEFT" | "RIGHT";
    start_line?: number | null;
    start_side?: "LEFT" | "RIGHT" | null;
    in_reply_to_id?: number;
  }) => Promise<void>;
  onEditComment: (commentId: number, body: string) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
  hasAnyCommentsOrSelection: boolean;
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
  currentUserLogin,
  onPostComment,
  onEditComment,
  onDeleteComment,
  hasAnyCommentsOrSelection,
}: DiffRowProps) {
  const [replyBody, setReplyBody] = useState("");
  const [newCommentBody, setNewCommentBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const side = line.type === "removed" ? "LEFT" : "RIGHT";
  const lineNumber = side === "LEFT" ? line.oldLineNumber : line.newLineNumber;

  // Check if this row is currently selected for a new comment
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

  const rowRoots = rowComments.filter((c) => !c.in_reply_to_id);
  const rowReplies = rowComments.filter((c) => c.in_reply_to_id);

  const threads = rowRoots.map((root) => {
    const replies = rowReplies
      .filter((r) => r.in_reply_to_id === root.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return { root, replies };
  });

  const rowId = lineNumber ? `diff-row-${side.toLowerCase()}-${lineNumber}` : undefined;

  const bgStyle = isSelected
    ? "rgba(25, 118, 210, 0.12)"
    : LINE_STYLES[line.type].bgcolor || "transparent";

  // Submit new reply
  const handleReplySubmit = async (rootId: number) => {
    if (!replyBody.trim()) return;
    setSubmitting(true);
    try {
      await onPostComment({
        body: replyBody,
        in_reply_to_id: rootId,
      });
      setReplyBody("");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit new thread
  const handleNewThreadSubmit = async () => {
    if (!newCommentBody.trim() || !selectedRange) return;
    setSubmitting(true);
    try {
      await onPostComment({
        body: newCommentBody,
        path: selectedRange.path,
        line: selectedRange.line,
        side: selectedRange.side,
        start_line: selectedRange.start_line,
        start_side: selectedRange.start_side,
      });
      setNewCommentBody("");
      onSelectRange(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

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
        alignItems: "stretch",
        borderBottom: "1px solid",
        borderColor: "divider",
        minHeight: 28,
        bgcolor: bgStyle,
        textDecoration: LINE_STYLES[line.type].textDecoration,
      }}
    >
      {/* Code Side Column */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "baseline",
          minWidth: 0,
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
      </Box>

      {/* Right Column Gutter for Inline Comments */}
      {hasAnyCommentsOrSelection && (
        <Box
          sx={{
            width: 380,
            flexShrink: 0,
            borderLeft: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            p: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            justifyContent: "center",
          }}
        >
          {/* New Comment Thread Form */}
          {isSelected && (
            <Card variant="outlined" sx={{ borderColor: "primary.main", bgcolor: "rgba(25, 118, 210, 0.02)" }}>
              <Box sx={{ px: 1.5, py: 0.5, bgcolor: "primary.main", color: "primary.contrastText", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" fontWeight={600}>
                  New Comment
                </Typography>
                <IconButton size="small" onClick={() => onSelectRange(null)} sx={{ color: "inherit", p: 0.25 }}>
                  <CloseIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Box>
              <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Leave a comment... (Markdown ok)"
                  size="small"
                  value={newCommentBody}
                  onChange={(e) => setNewCommentBody(e.target.value)}
                  disabled={submitting}
                  sx={{ "& .MuiInputBase-root": { fontSize: "0.75rem" }, mb: 1 }}
                />
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                  <Button size="small" onClick={() => onSelectRange(null)} disabled={submitting} sx={{ fontSize: "0.7rem" }}>
                    Cancel
                  </Button>
                  <Button size="small" variant="contained" onClick={handleNewThreadSubmit} disabled={submitting || !newCommentBody.trim()} sx={{ fontSize: "0.7rem" }}>
                    Add
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Existing Thread Cards */}
          {threads.map((thread) => (
            <Card key={thread.root.id} variant="outlined" sx={{ width: "100%" }}>
              <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                {/* Root Comment */}
                <InlineCommentCard
                  comment={thread.root}
                  currentUserLogin={currentUserLogin}
                  onEdit={onEditComment}
                  onDelete={onDeleteComment}
                />

                {/* Nested Replies */}
                {thread.replies.map((reply) => (
                  <Box key={reply.id} sx={{ pl: 2, borderLeft: "1px solid", borderColor: "divider", mt: 1 }}>
                    <InlineCommentCard
                      comment={reply}
                      currentUserLogin={currentUserLogin}
                      onEdit={onEditComment}
                      onDelete={onDeleteComment}
                    />
                  </Box>
                ))}

                {/* Reply Input Form */}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <TextField
                    fullWidth
                    placeholder="Reply..."
                    size="small"
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    disabled={submitting}
                    sx={{ "& .MuiInputBase-root": { fontSize: "0.7rem", height: 28 } }}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleReplySubmit(thread.root.id)}
                    disabled={submitting || !replyBody.trim()}
                    sx={{ height: 28, textTransform: "none", fontSize: "0.7rem" }}
                  >
                    Reply
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
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
  currentUserLogin,
  onPostComment,
  onEditComment,
  onDeleteComment,
  hasAnyCommentsOrSelection,
}: {
  hunk: { header: string; lines: { line: DiffLine; index: number }[] };
  isMarkdown: boolean;
  language: string | null;
  path: string;
  selectedRange: CommentSelectionRange | null;
  onSelectRange: (range: CommentSelectionRange | null) => void;
  comments: GitHubPRComment[];
  currentUserLogin: string;
  onPostComment: (payload: {
    body: string;
    path?: string;
    line?: number;
    side?: "LEFT" | "RIGHT";
    start_line?: number | null;
    start_side?: "LEFT" | "RIGHT" | null;
    in_reply_to_id?: number;
  }) => Promise<void>;
  onEditComment: (commentId: number, body: string) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
  hasAnyCommentsOrSelection: boolean;
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
          currentUserLogin={currentUserLogin}
          onPostComment={onPostComment}
          onEditComment={onEditComment}
          onDeleteComment={onDeleteComment}
          hasAnyCommentsOrSelection={hasAnyCommentsOrSelection}
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
  currentUserLogin: string;
  onPostComment: (payload: {
    body: string;
    path?: string;
    line?: number;
    side?: "LEFT" | "RIGHT";
    start_line?: number | null;
    start_side?: "LEFT" | "RIGHT" | null;
    in_reply_to_id?: number;
  }) => Promise<void>;
  onEditComment: (commentId: number, body: string) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
}

export default function DiffViewer({
  file,
  language,
  selectedRange,
  onSelectRange,
  comments,
  currentUserLogin,
  onPostComment,
  onEditComment,
  onDeleteComment,
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

  // Determine if this file has comments or active selection to render the gutter
  const fileComments = comments.filter((c) => c.path === file.filename);
  const hasSelection = selectedRange && selectedRange.path === file.filename;
  const hasAnyCommentsOrSelection = fileComments.length > 0 || !!hasSelection;

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
            currentUserLogin={currentUserLogin}
            onPostComment={onPostComment}
            onEditComment={onEditComment}
            onDeleteComment={onDeleteComment}
            hasAnyCommentsOrSelection={hasAnyCommentsOrSelection}
          />
        ))}
      </Box>
    </Box>
  );
}
