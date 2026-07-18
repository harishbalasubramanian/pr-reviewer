"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import LinkIcon from "@mui/icons-material/Link";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { GitHubPRComment, CommentSelectionRange } from "@/types/github";

interface CommentsPanelProps {
  comments: GitHubPRComment[];
  selectedFile: string;
  selectedRange: CommentSelectionRange | null;
  onClearRange: () => void;
  onPostComment: (payload: {
    body: string;
    path?: string;
    line?: number;
    side?: "LEFT" | "RIGHT";
    start_line?: number | null;
    start_side?: "LEFT" | "RIGHT" | null;
    in_reply_to_id?: number;
  }) => Promise<void>;
  onJumpToLine: (line: number, side: "LEFT" | "RIGHT") => void;
  focusedThreadId?: number | null;
  onClearFocusedThread?: () => void;
}

interface Thread {
  root: GitHubPRComment;
  replies: GitHubPRComment[];
}

export default function CommentsPanel({
  comments,
  selectedFile,
  selectedRange,
  onClearRange,
  onPostComment,
  onJumpToLine,
  focusedThreadId,
  onClearFocusedThread,
}: CommentsPanelProps) {
  const [newCommentBody, setNewCommentBody] = useState("");
  const [replyBodies, setReplyBodies] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Filter comments for this file only
  const fileComments = comments.filter((c) => c.path === selectedFile);

  // Group comments into threads
  const threads: Thread[] = [];
  const replies: GitHubPRComment[] = [];

  fileComments.forEach((c) => {
    if (c.in_reply_to_id) {
      replies.push(c);
    } else {
      threads.push({ root: c, replies: [] });
    }
  });

  replies.forEach((reply) => {
    const thread = threads.find((t) => t.root.id === reply.in_reply_to_id);
    if (thread) {
      thread.replies.push(reply);
    } else {
      // Treat orphan replies as roots
      threads.push({ root: reply, replies: [] });
    }
  });

  // Sort replies chronologically
  threads.forEach((t) => {
    t.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  });

  // Sort threads chronologically by root comment
  threads.sort((a, b) => new Date(a.root.created_at).getTime() - new Date(b.root.created_at).getTime());

  // Handle new thread submit
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
      onClearRange();
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle reply submit
  const handleReplySubmit = async (rootId: number) => {
    const body = replyBodies[rootId];
    if (!body || !body.trim()) return;

    setSubmitting(true);
    try {
      await onPostComment({
        body,
        in_reply_to_id: rootId,
      });
      setReplyBodies((prev) => ({ ...prev, [rootId]: "" }));
    } catch (err) {
      console.error("Failed to post reply:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Format thread location details
  const getThreadLocationLabel = (root: GitHubPRComment) => {
    const sideLabel = root.side === "LEFT" ? "removed" : "added/context";
    if (root.start_line && root.start_line !== root.line) {
      return `Lines ${root.start_line} - ${root.line} (${sideLabel})`;
    }
    return `Line ${root.line} (${sideLabel})`;
  };

  return (
    <Box
      sx={{
        width: 360,
        flexShrink: 0,
        borderLeft: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Panel Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <ChatIcon sx={{ color: "text.secondary", fontSize: 18 }} />
        <Typography variant="subtitle2" fontWeight={600} sx={{ flexGrow: 1 }}>
          Review Comments
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {fileComments.length} {fileComments.length === 1 ? "comment" : "comments"}
        </Typography>
      </Box>

      {/* Main scrollable body */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", px: 2, py: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        
        {/* Focused thread banner */}
        {focusedThreadId && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              bgcolor: "primary.light",
              color: "primary.contrastText",
              px: 1.5,
              py: 0.75,
              borderRadius: 1,
              mb: 1,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Viewing matched thread
            </Typography>
            <IconButton
              size="small"
              onClick={onClearFocusedThread}
              sx={{ color: "inherit", p: 0.25 }}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        )}

        {/* Create New Thread Input Box */}
        {selectedRange && selectedRange.path === selectedFile && (
          <Card
            variant="outlined"
            sx={{
              borderColor: "primary.main",
              borderWidth: 1.5,
              bgcolor: "rgba(25, 118, 210, 0.02)",
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 1,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                New Comment: {selectedRange.start_line ? `Lines ${selectedRange.start_line}-${selectedRange.line}` : `Line ${selectedRange.line}`} ({selectedRange.side === "LEFT" ? "Left" : "Right"})
              </Typography>
              <IconButton size="small" onClick={onClearRange} sx={{ color: "inherit", p: 0.25 }}>
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Write your review comment... (Markdown supported)"
                variant="outlined"
                size="small"
                value={newCommentBody}
                onChange={(e) => setNewCommentBody(e.target.value)}
                disabled={submitting}
                sx={{ mb: 1.5 }}
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                <Button size="small" variant="text" onClick={onClearRange} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleNewThreadSubmit}
                  disabled={submitting || !newCommentBody.trim()}
                >
                  Post Comment
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Threads List */}
        {threads.length === 0 ? (
          <Box sx={{ py: 6, textCenter: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" color="text.secondary" align="center">
              No comments on this file yet.
            </Typography>
            <Typography variant="caption" color="text.disabled" align="center">
              Select or highlight text in the diff to leave a comment.
            </Typography>
          </Box>
        ) : (
          threads.map((thread) => {
            const isFocused = focusedThreadId === thread.root.id;
            return (
              <Card
                key={thread.root.id}
                variant="outlined"
                sx={{
                  borderWidth: isFocused ? 2 : 1,
                  borderColor: isFocused ? "primary.main" : "divider",
                  boxShadow: isFocused ? "0 0 8px rgba(25, 118, 210, 0.2)" : "none",
                  transition: "all 0.2s ease-in-out",
                }}
              >
                {/* Thread Header */}
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    bgcolor: isFocused ? "rgba(25, 118, 210, 0.05)" : "rgba(0, 0, 0, 0.02)",
                    borderBottom: "1px solid",
                    borderColor: isFocused ? "primary.main" : "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                    {getThreadLocationLabel(thread.root)}
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<LinkIcon sx={{ fontSize: 12 }} />}
                    sx={{ fontSize: "0.65rem", py: 0.25, minWidth: 0 }}
                    onClick={() => onJumpToLine(thread.root.line || 0, thread.root.side || "RIGHT")}
                  >
                    Jump to Diff
                  </Button>
                </Box>

                {/* Root Comment */}
                <Box sx={{ p: 1.5 }}>
                  <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                    <Avatar src={thread.root.user.avatar_url} alt={thread.root.user.login} sx={{ width: 24, height: 24 }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                        <Typography variant="caption" fontWeight={600}>
                          {thread.root.user.login}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem" }}>
                          {new Date(thread.root.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Box sx={{ fontSize: "0.75rem", mt: 0.5, "& p": { m: 0 } }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {thread.root.body}
                        </ReactMarkdown>
                      </Box>
                    </Box>
                  </Box>

                  {/* Nested Replies */}
                  {thread.replies.map((reply) => (
                    <Box key={reply.id} sx={{ display: "flex", gap: 1, mt: 2, pl: 3 }}>
                      <Avatar src={reply.user.avatar_url} alt={reply.user.login} sx={{ width: 20, height: 20 }} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                          <Typography variant="caption" fontWeight={600}>
                            {reply.user.login}
                          </Typography>
                          <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem" }}>
                            {new Date(reply.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Box sx={{ fontSize: "0.75rem", mt: 0.5, "& p": { m: 0 } }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {reply.body}
                          </ReactMarkdown>
                        </Box>
                      </Box>
                    </Box>
                  ))}

                  {/* Reply Input Box */}
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={1}
                      placeholder="Reply..."
                      variant="outlined"
                      size="small"
                      value={replyBodies[thread.root.id] || ""}
                      onChange={(e) =>
                        setReplyBodies((prev) => ({ ...prev, [thread.root.id]: e.target.value }))
                      }
                      disabled={submitting}
                      sx={{ "& .MuiInputBase-root": { fontSize: "0.75rem" } }}
                    />
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleReplySubmit(thread.root.id)}
                      disabled={submitting || !(replyBodies[thread.root.id] || "").trim()}
                      sx={{ height: 32, textTransform: "none", fontSize: "0.75rem" }}
                    >
                      Reply
                    </Button>
                  </Box>
                </Box>
              </Card>
            );
          })
        )}
      </Box>
    </Box>
  );
}
