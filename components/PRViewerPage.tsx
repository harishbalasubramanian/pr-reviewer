"use client";

import { useState } from "react";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import GitHubIcon from "@mui/icons-material/GitHub";
import MergeConflictBanner from "@/components/MergeConflictBanner";
import FileSidebar from "@/components/FileSidebar";
import FilePanel from "@/components/FilePanel";
import type { GitHubPullRequest, GitHubPRFile } from "@/types/github";

interface PRViewerPageProps {
  owner: string;
  repo: string;
  prNumber: number;
  pr: GitHubPullRequest;
  files: GitHubPRFile[];
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
  userLogin,
  userAvatarUrl,
}: PRViewerPageProps) {
  const [selectedFile, setSelectedFile] = useState<GitHubPRFile | null>(null);

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
          <PRStatusChip pr={pr} />
          <Typography variant="h6" component="h1" fontWeight={600} color="text.primary">
            {pr.title}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <Avatar src={pr.user.avatar_url} alt={pr.user.login} sx={{ width: 18, height: 18 }} />
          <Typography variant="body2" color="text.secondary">
            <strong>{pr.user.login}</strong> wants to merge{" "}
            <code>{pr.head.ref}</code> into <code>{pr.base.ref}</code>
          </Typography>
        </Box>

        <MergeConflictBanner
          owner={owner}
          repo={repo}
          prNumber={prNumber}
          initialMergeable={pr.mergeable}
          initialMergeableState={pr.mergeable_state}
        />
      </Box>

      {/* Two-column body: sidebar + file panel */}
      <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
        <FileSidebar
          files={files}
          selectedFile={selectedFile}
          onSelectFile={setSelectedFile}
        />
        <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
          <FilePanel file={selectedFile} />
        </Box>
      </Box>
    </Box>
  );
}
