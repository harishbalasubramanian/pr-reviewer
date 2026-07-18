"use client";

// Handles the mergeable=null async case from GitHub.
// GitHub computes mergeability after a PR is fetched — the first response often has null.
// If we get null, we re-fetch once after a short delay and update the banner.

import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";

interface MergeConflictBannerProps {
  owner: string;
  repo: string;
  prNumber: number;
  initialMergeable: boolean | null;
  initialMergeableState: string;
}

export default function MergeConflictBanner({
  owner,
  repo,
  prNumber,
  initialMergeable,
  initialMergeableState,
}: MergeConflictBannerProps) {
  const [mergeableState, setMergeableState] = useState(initialMergeableState);
  const [mergeable, setMergeable] = useState(initialMergeable);
  const hasFetched = useRef(false); // prevents more than one re-fetch



  //Test Test Test Test
  useEffect(() => {
    setMergeable(initialMergeable);
    setMergeableState(initialMergeableState);
    if (initialMergeable !== null) {
      hasFetched.current = true;
    }
  }, [initialMergeable, initialMergeableState]);

  useEffect(() => {
    // If GitHub has already computed mergeability, nothing to do.
    if (initialMergeable !== null) return;
    // If we already fired the re-fetch for this mount, don't fire again.
    if (hasFetched.current) return;

    hasFetched.current = true;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/pr/${owner}/${repo}/${prNumber}`);
        if (!res.ok) return;
        const data = await res.json();
        setMergeable(data.mergeable);
        setMergeableState(data.mergeable_state);
      } catch {
        // Silently ignore — the banner is best-effort, not critical.
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [initialMergeable, owner, repo, prNumber]);

  if (mergeable === null || mergeableState !== "dirty") return null;

  return (
    <Alert severity="warning" sx={{ mb: 2, borderRadius: 1 }}>
      This PR has conflicts with the base branch.
    </Alert>
  );
}
