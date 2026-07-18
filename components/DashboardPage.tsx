"use client";

import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import GitHubIcon from "@mui/icons-material/GitHub";

interface DashboardPageProps {
  login: string;
  avatarUrl: string;
}

export default function DashboardPage({ login, avatarUrl }: DashboardPageProps) {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
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
          <GitHubIcon sx={{ color: "text.primary", mr: 0.5 }} />
          <Typography
            variant="subtitle1"
            fontWeight={600}
            color="text.primary"
            sx={{ flexGrow: 1 }}
          >
            PR Reviewer
          </Typography>

          <Avatar
            src={avatarUrl}
            alt={login}
            sx={{ width: 28, height: 28 }}
          />
          <Typography variant="body2" color="text.secondary">
            {login}
          </Typography>

          {/* POST to logout — form prevents the CSRF issue a plain link would have. */}
          <form action="/api/auth/logout" method="POST">
            <Button
              type="submit"
              size="small"
              variant="outlined"
              sx={{ textTransform: "none", ml: 1 }}
            >
              Sign out
            </Button>
          </form>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "calc(100vh - 64px)",
          color: "text.secondary",
        }}
      >
        <Typography variant="body1">
          PR viewer coming in the next PR.
        </Typography>
      </Box>
    </Box>
  );
}
