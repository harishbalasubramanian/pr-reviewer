# PR Plan — PR Comment Reviewer

This is the sequenced plan for building the PR Comment Reviewer MVP.
Each PR is scoped to be independently reviewable and mergeable without breaking the app state.
PRs build on each other in strict order — later PRs assume the earlier ones are merged.

---

## PR 1 — Project Scaffold & GitHub OAuth

**Goal:** Get a working repo skeleton and end-to-end GitHub OAuth sign-in flow.

**Scope:**
- Initialize the project (framework, folder structure, linting config, env setup)
- GitHub OAuth App flow: `/auth/login` redirect → GitHub callback → exchange code for access token
- Store the access token server-side in a session (e.g. encrypted cookie or server session store)
- Simple landing page with a "Sign in with GitHub" button
- After login, show the user's GitHub username to confirm the token works (call `GET /user`)
- Sign-out that clears the session

**Out of scope for this PR:**
- Any PR viewing or diff logic

**Why first:** Everything downstream depends on having a valid GitHub token in session. This unblocks all API calls in later PRs.

---

## PR 2 — PR Access Check & Repo/PR Entry UI

**Goal:** Let authenticated users enter a repo + PR number and verify they have access.

**Scope:**
- A form for the user to input `owner/repo` and a PR number
- On submit, call `GET /repos/{owner}/{repo}/pulls/{pull_number}` with the user's token
- 200 → navigate to the PR viewer page (stub page for now)
- 403/404 → show a clear access-denied error state in the UI
- Pull basic PR metadata from the 200 response to display (title, author, base/head branch)
- Also fetch `mergeable` and `mergeable_state` and surface a "This PR has conflicts with the base branch" banner if `mergeable_state === "dirty"`; handle `mergeable === null` gracefully (no banner, optionally re-fetch once after a short delay)

**Out of scope for this PR:**
- Actual diff rendering or commenting

**Why here:** Establishes the access-check pattern that gates the entire viewer. Merge-conflict banner belongs here because it reads from the same PR metadata fetch.

---

## PR 3 — File List Sidebar

**Goal:** Display all changed files for a PR in a sidebar, distinguishing markdown vs non-markdown.

**Scope:**
- Call `GET /repos/{owner}/{repo}/pulls/{pull_number}/files` and render a sidebar listing all changed files
- Visually distinguish markdown files (`.md`, `.markdown`) from others
- Clicking a markdown file will eventually open the diff viewer (stub navigation for now)
- Clicking a non-markdown file shows a placeholder panel: a short message plus a link to that file's diff on `github.com`
- Cache the file list keyed by `(repo, pr_number, head_sha)` so navigating between files doesn't re-fetch; invalidate on manual refresh

**Out of scope for this PR:**
- Parsing or rendering any diffs

**Why here:** The sidebar is a prerequisite for the diff viewer in PR 4 — it drives which file is active.

---

## PR 4 — Unified Diff Parsing & Markdown Diff Renderer

**Goal:** Parse the raw unified diff for a markdown file and render it as a styled, formatted diff.

**Scope:**
- For the selected markdown file, extract the `patch` field from the files API response
- Parse the unified diff into hunks and classify each line as added, removed, or context
- Render each line's content as markdown (not raw text) so formatting is preserved
  - Added lines → green background
  - Removed lines → red background + strikethrough
  - Context lines → normal styling
- Wire this up to the sidebar so clicking a markdown file shows its rendered diff
- No special-casing for edge cases (code fences, tables, images, frontmatter) — let the line-level renderer handle them as-is per the spec

**Out of scope for this PR:**
- Commenting; line selection/highlighting

**Why here:** Core feature of the product. Code file viewer (PR 5) extends this to all file types. Commenting (PR 6) layers on top.

---

## PR 5 — Code File Diff Viewer

**Goal:** Extend the diff viewer to all file types, not just markdown — using GitHub-style syntax-highlighted rendering for code files.

**Scope:**
- Remove the "not rendered in-app" placeholder for non-markdown files
- Route all files with a `patch` field through the unified diff viewer
- Detect file language from extension and apply syntax highlighting via `highlight.js`
- Use the GitHub light theme for highlight.js so the styling is familiar
- Per-line syntax highlighting (accepts multi-line context limitation for MVP)
- Files with no `patch` (binary, oversized) continue to show the GitHub link fallback

**Out of scope for this PR:**
- Full-file view (we're still showing only the diff/patch, not the entire file)
- Whole-file syntax highlighting that respects multi-line constructs across hunk boundaries

**Why here:** Natural extension of PR 4's diff structure — same renderer, different per-line content strategy.

---

## PR 6 — Inline Commenting & GitHub Comment Sync

**Goal:** Let users highlight text in the diff and post a comment that syncs to GitHub as a real PR review comment.

**Scope:**
- User highlights a range of rendered text → a "Add comment" affordance appears
- Comment input panel opens (right-side panel)
- Resolve the highlighted range to `{ path, line, side }`:
  - `"RIGHT"` for added/context lines, `"LEFT"` for removed lines
  - Multi-line highlights → also set `start_line` / `start_side`
- Post via `POST /repos/{owner}/{repo}/pulls/{pull_number}/comments` with `{ body, commit_id, path, line, side }` (immediate single-comment mode per the spec)
  - `commit_id` = current head SHA
- On page load, fetch existing review comments from GitHub and display them in the right-side panel anchored to their diff position
- GitHub is the source of truth — no local comment store

**Out of scope for this PR:**
- Approve / Request Changes review states
- Batched review submission (can be a follow-up)

**Why here:** Depends on the rendered diff (PRs 4 & 5) to know what lines exist and how to anchor comments.

---

## PR 7 — Manual Refresh & Stale-State Handling

**Goal:** Add a manual refresh action so users can pick up new commits without reloading the page.

**Scope:**
- "Refresh" button in the PR viewer header
- On click: re-fetch PR metadata (including new `head_sha`), file list, and diff for the active file
- Invalidate the `(repo, pr_number, head_sha)` cache so fresh data is fetched
- Re-fetch comments from GitHub to reflect any new comments posted outside the app
- No special handling for comments anchored to now-stale line ranges (acceptable per spec — same spirit as GitHub's own "outdated" behavior)
- Snapshot the head SHA on initial page load and use it consistently for all API calls until the next refresh

**Why last:** All the data flows it touches (diff, comments, metadata) need to exist first. Low risk, low complexity — good final PR before any follow-up work.

---

## Summary Table

| PR | Title | Key Deliverable |
|----|-------|-----------------|
| 1  | Project Scaffold & GitHub OAuth | Auth flow, session, sign-in/out |
| 2  | PR Access Check & Entry UI | Repo+PR form, access gate, conflict banner |
| 3  | File List Sidebar | Sidebar with markdown/non-markdown split, caching |
| 4  | Diff Parsing & Markdown Renderer | Rendered line-level diff for markdown files |
| 5  | Code File Diff Viewer | Syntax-highlighted diff for all file types |
| 6  | Inline Commenting & GitHub Sync | Highlight → comment → posts to GitHub |
| 7  | Manual Refresh | Refresh action, cache invalidation, stale comment handling |
