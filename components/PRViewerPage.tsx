"use client";

import { useEffect, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Badge from "@mui/material/Badge";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import GitHubIcon from "@mui/icons-material/GitHub";
import RefreshIcon from "@mui/icons-material/Refresh";
import { keyframes } from "@mui/system";
import MergeConflictBanner from "@/components/MergeConflictBanner";
import FileSidebar from "@/components/FileSidebar";
import FilePanel from "@/components/FilePanel";
import type { GitHubPullRequest, GitHubPRFile, GitHubPRComment, CommentSelectionRange } from "@/types/github";

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(2, 136, 209, 0.7);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(2, 136, 209, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(2, 136, 209, 0);
  }
`;

interface PRViewerPageProps {
  owner: string;
  repo: string;
  prNumber: number;
  pr: GitHubPullRequest;
  files: GitHubPRFile[];
  initialComments: GitHubPRComment[];
  userLogin: string;
  userAvatarUrl: string;
}

function PRStatusChip({ pr }: { pr: GitHubPullRequest }) {
  if (pr.merged) {
    return <Chip label="Merged" size="small" sx={{ bgcolor: "#8250df", color: "#fff", fontWeight: 600 }} />;
  }
  if (pr.state === "closed") {
    return <Chip label="Closed" size="small" color="error" sx={{ fontWeight: 600 }} />;
  }
  return <Chip label="Open" size="small" color="success" sx={{ fontWeight: 600 }} />;
}

export default function PRViewerPage({
  owner,
  repo,
  prNumber,
  pr,
  files,
  initialComments,
  userLogin,
  userAvatarUrl,
}: PRViewerPageProps) {
  const [prState, setPrState] = useState<GitHubPullRequest>(pr);
  const [filesState, setFilesState] = useState<GitHubPRFile[]>(files);
  const [selectedFile, setSelectedFile] = useState<GitHubPRFile | null>(null);
  const [comments, setComments] = useState<GitHubPRComment[]>(initialComments);
  const [selectedRange, setSelectedRange] = useState<CommentSelectionRange | null>(null);
  const [snapshotHeadSha, setSnapshotHeadSha] = useState<string>(pr.head.sha);
  const [latestHeadSha, setLatestHeadSha] = useState<string>(pr.head.sha);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const checkCommit = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/pr/${owner}/${repo}/${prNumber}?t=${Date.now()}`);
        if (res.ok) {
          const freshPr = await res.json();
          if (freshPr?.head?.sha) {
            setLatestHeadSha(freshPr.head.sha);
          }
        }
      } catch (err) {
        console.error("Background check for commit updates failed:", err);
      }
    };

    const interval = setInterval(checkCommit, 15000);
    return () => clearInterval(interval);
  }, [owner, repo, prNumber]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/pr/${owner}/${repo}/${prNumber}/comments?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const timestamp = Date.now();
      const [prRes, filesRes, commentsRes] = await Promise.all([
        fetch(`/api/pr/${owner}/${repo}/${prNumber}?t=${timestamp}`),
        fetch(`/api/pr/${owner}/${repo}/${prNumber}/files?t=${timestamp}`),
        fetch(`/api/pr/[owner]/[repo]/[prNumber]/comments?t=${timestamp}`).catch(() =>
          fetch(`/api/pr/${owner}/${repo}/${prNumber}/comments?t=${timestamp}`)
        ),
      ]);

      if (!prRes.ok || !filesRes.ok || !commentsRes.ok) {
        throw new Error("Failed to re-fetch one or more PR resources");
      }

      const freshPr = await prRes.json();
      const freshFiles = await filesRes.json();
      const freshComments = await commentsRes.json();

      setPrState(freshPr);
      setFilesState(freshFiles);
      setComments(freshComments);
      setSnapshotHeadSha(freshPr.head.sha);
      setLatestHeadSha(freshPr.head.sha);

      // Keep active file selected if it still exists in the new file list
      if (selectedFile) {
        const updatedFile = freshFiles.find((f: GitHubPRFile) => f.filename === selectedFile.filename);
        setSelectedFile(updatedFile || null);
      }
      setSelectedRange(null);
    } catch (err) {
      console.error("Refresh failed:", err);
      alert("Failed to refresh. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  const handlePostComment = async (payload: {
    body: string;
    path?: string;
    line?: number;
    side?: "LEFT" | "RIGHT";
    start_line?: number | null;
    start_side?: "LEFT" | "RIGHT" | null;
    in_reply_to_id?: number;
  }) => {
    try {
      const res = await fetch(`/api/pr/${owner}/${repo}/${prNumber}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          commit_id: snapshotHeadSha,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to post comment");
      }

      await fetchComments();
    } catch (err) {
      console.error("Error posting comment:", err);
      alert(err instanceof Error ? err.message : "Failed to post comment");
      throw err;
    }
  };

  const handleEditComment = async (commentId: number, body: string) => {
    try {
      const res = await fetch(`/api/pr/${owner}/${repo}/${prNumber}/comments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id: commentId, body }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to edit comment");
      }

      await fetchComments();
    } catch (err) {
      console.error("Error editing comment:", err);
      alert(err instanceof Error ? err.message : "Failed to edit comment");
      throw err;
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;

    try {
      const res = await fetch(`/api/pr/${owner}/${repo}/${prNumber}/comments?comment_id=${commentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to delete comment");
      }

      await fetchComments();
    } catch (err) {
      console.error("Error deleting comment:", err);
      alert(err instanceof Error ? err.message : "Failed to delete comment");
      throw err;
    }
  };


  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <Link
            href="/dashboard"
            underline="none"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              color: "text.secondary",
              mr: 1,
              "&:hover": { color: "text.primary" },
            }}
          >
            <ArrowBackIcon fontSize="small" />
            <Typography variant="body2">Dashboard</Typography>
          </Link>

          <GitHubIcon sx={{ color: "text.secondary", fontSize: 18 }} />
          <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
            {owner}/{repo} <strong>#{prNumber}</strong>
          </Typography>

          <Avatar src={userAvatarUrl} alt={userLogin} sx={{ width: 28, height: 28 }} />
          <Typography variant="body2" color="text.secondary">
            {userLogin}
          </Typography>

          <form action="/api/auth/logout" method="POST">
            <Button type="submit" size="small" variant="outlined" sx={{ textTransform: "none", ml: 1 }}>
              Sign out
            </Button>
          </form>
        </Toolbar>
      </AppBar>

      {/* PR header: title, author, branch, conflict banner */}
      <Box sx={{ px: 3, py: 2.5, borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <PRStatusChip pr={prState} />
          <Typography variant="h6" component="h1" fontWeight={600} color="text.primary" sx={{ flexGrow: 1 }}>
            {prState.title}
          </Typography>
          <Badge
            color="error"
            variant="dot"
            invisible={latestHeadSha === snapshotHeadSha}
            sx={{
              "& .MuiBadge-badge": {
                right: 4,
                top: 4,
              }
            }}
          >
            <Button
              size="small"
              variant={latestHeadSha !== snapshotHeadSha ? "contained" : "outlined"}
              color={latestHeadSha !== snapshotHeadSha ? "primary" : "inherit"}
              onClick={handleRefresh}
              disabled={refreshing}
              startIcon={<RefreshIcon sx={{ animation: refreshing ? `${spin} 1s linear infinite` : "none" }} />}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                animation: latestHeadSha !== snapshotHeadSha && !refreshing ? `${pulse} 2s infinite` : "none",
              }}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </Badge>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <Avatar src={prState.user.avatar_url} alt={prState.user.login} sx={{ width: 18, height: 18 }} />
          <Typography variant="body2" color="text.secondary">
            <strong>{prState.user.login}</strong> wants to merge{" "}
            <code>{prState.head.ref}</code> into <code>{prState.base.ref}</code>
          </Typography>
        </Box>

        {latestHeadSha !== snapshotHeadSha && (
          <Alert
            severity="info"
            sx={{
              mb: 2,
              borderRadius: 1.5,
              "& .MuiAlert-message": {
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                width: "100%",
                justifyContent: "space-between",
                flexWrap: "wrap",
              }
            }}
          >
            <Typography variant="body2" sx={{ m: 0 }}>
              A new commit is available on GitHub. Click Refresh to load the latest changes.
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={handleRefresh}
              disabled={refreshing}
              sx={{ textTransform: "none", py: 0, px: 1, fontWeight: 600 }}
            >
              Refresh View
            </Button>
          </Alert>
        )}

        <MergeConflictBanner
          owner={owner}
          repo={repo}
          prNumber={prNumber}
          initialMergeable={prState.mergeable}
          initialMergeableState={prState.mergeable_state}
        />
      </Box>

      {/* Two-column body: sidebar + file panel with inline comments gutter */}
      <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
        <FileSidebar
          files={filesState}
          selectedFile={selectedFile}
          onSelectFile={(file) => {
            setSelectedFile(file);
            setSelectedRange(null); // Clear selection state when switching files
          }}
        />
        
        <Box sx={{ flexGrow: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          <FilePanel
            file={selectedFile}
            selectedRange={selectedRange}
            onSelectRange={setSelectedRange}
            comments={comments}
            currentUserLogin={userLogin}
            onPostComment={handlePostComment}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
          />
        </Box>
      </Box>
    </Box>
  );
}
