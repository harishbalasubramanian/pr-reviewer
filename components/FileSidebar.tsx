"use client";

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArticleIcon from "@mui/icons-material/Article";
import CodeIcon from "@mui/icons-material/Code";
import { isMarkdownFile } from "@/lib/github";
import type { GitHubPRFile } from "@/types/github";

interface FileSidebarProps {
  files: GitHubPRFile[];
  selectedFile: GitHubPRFile | null;
  onSelectFile: (file: GitHubPRFile) => void;
}

function AdditionsDeletions({ additions, deletions }: { additions: number; deletions: number }) {
  return (
    <Box sx={{ display: "flex", gap: 0.5, ml: 1, flexShrink: 0 }}>
      {additions > 0 && (
        <Typography variant="caption" sx={{ color: "success.main", fontWeight: 600 }}>
          +{additions}
        </Typography>
      )}
      {deletions > 0 && (
        <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
          -{deletions}
        </Typography>
      )}
    </Box>
  );
}

export default function FileSidebar({ files, selectedFile, onSelectFile }: FileSidebarProps) {
  const isTruncated = files.length === 100;

  return (
    <Box
      sx={{
        width: 280,
        flexShrink: 0,
        borderRight: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {files.length} {files.length === 1 ? "file" : "files"} changed
          {isTruncated && " (first 100)"}
        </Typography>
      </Box>

      <List dense disablePadding sx={{ flexGrow: 1 }}>
        {files.map((file) => {
          const isMarkdown = isMarkdownFile(file.filename);
          const isSelected = selectedFile?.filename === file.filename;
          // Show just the basename in the list; full path in a tooltip.
          const basename = file.filename.split("/").pop() ?? file.filename;
          const hasDirectory = file.filename.includes("/");

          return (
            <Box key={file.filename}>
              <Tooltip
                title={hasDirectory ? file.filename : ""}
                placement="right"
                arrow
              >
                <ListItemButton
                  selected={isSelected}
                  onClick={() => onSelectFile(file)}
                  sx={{ py: 0.75, px: 1.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    {isMarkdown ? (
                      <ArticleIcon fontSize="small" sx={{ color: "primary.main" }} />
                    ) : (
                      <CodeIcon fontSize="small" sx={{ color: "text.disabled" }} />
                    )}
                  </ListItemIcon>

                  <ListItemText
                    primary={basename}
                    secondary={hasDirectory ? file.filename.replace(`/${basename}`, "") : undefined}
                    primaryTypographyProps={{ variant: "body2", noWrap: true }}
                    secondaryTypographyProps={{ variant: "caption", noWrap: true }}
                    sx={{ mr: 0 }}
                  />

                  <AdditionsDeletions
                    additions={file.additions}
                    deletions={file.deletions}
                  />
                </ListItemButton>
              </Tooltip>
              <Divider component="li" />
            </Box>
          );
        })}
      </List>
    </Box>
  );
}
