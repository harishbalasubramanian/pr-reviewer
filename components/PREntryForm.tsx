"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import GitHubIcon from "@mui/icons-material/GitHub";

type FormError =
  | { type: "validation"; message: string }
  | { type: "access"; message: string }
  | { type: "network"; message: string };

export default function PREntryForm() {
  const router = useRouter();
  const [repoInput, setRepoInput] = useState("");
  const [prNumberInput, setPrNumberInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FormError | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation before hitting the API.
    const parts = repoInput.trim().split("/");
    const owner = parts[0]?.trim();
    const repo = parts[1]?.trim();

    if (!owner || !repo || parts.length !== 2) {
      setError({ type: "validation", message: 'Enter a repo as "owner/repo" (e.g. facebook/react).' });
      return;
    }

    const prNum = parseInt(prNumberInput, 10);
    if (isNaN(prNum) || prNum <= 0) {
      setError({ type: "validation", message: "PR number must be a positive integer." });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/pr/${owner}/${repo}/${prNum}`);

      if (res.status === 403 || res.status === 404) {
        setError({ type: "access", message: "PR not found or you don't have access to this repo." });
        return;
      }

      if (!res.ok) {
        setError({ type: "network", message: "Something went wrong. Please try again." });
        return;
      }

      router.push(`/pr/${owner}/${repo}/${prNum}`);
    } catch {
      setError({ type: "network", message: "Network error. Check your connection and try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexGrow: 1,
        p: 2,
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 460,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
            <GitHubIcon sx={{ color: "text.secondary", fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight={600} color="text.primary">
              Open a Pull Request
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              id="repo-input"
              label="Repository"
              placeholder="owner/repo"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              disabled={loading}
              size="small"
              fullWidth
              autoFocus
            />

            <TextField
              id="pr-number-input"
              label="PR Number"
              placeholder="123"
              value={prNumberInput}
              onChange={(e) => setPrNumberInput(e.target.value)}
              disabled={loading}
              size="small"
              fullWidth
              inputProps={{ inputMode: "numeric" }}
            />

            {error && (
              <Alert severity={error.type === "access" ? "warning" : "error"}>
                {error.message}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              {loading ? "Checking access…" : "Go to PR"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
