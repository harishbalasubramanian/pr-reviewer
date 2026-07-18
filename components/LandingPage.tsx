"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import GitHubIcon from "@mui/icons-material/GitHub";

export default function LandingPage({ authFailed }: { authFailed: boolean }) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 420,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
            <GitHubIcon sx={{ fontSize: 28, color: "text.primary" }} />
            <Typography variant="h6" fontWeight={600} color="text.primary">
              PR Reviewer
            </Typography>
          </Box>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Review GitHub pull requests with rendered markdown diffs and inline
            comments that sync back to GitHub.
          </Typography>

          {authFailed && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Sign-in failed. Please try again.
            </Alert>
          )}

          <Button
            href="/api/auth/login"
            variant="contained"
            fullWidth
            size="large"
            startIcon={<GitHubIcon />}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Sign in with GitHub
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
