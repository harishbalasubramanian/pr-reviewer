# CLAUDE.md — Project Context

## What This Is

PR Comment Reviewer — a web tool for reviewing GitHub PRs with rendered markdown diffs and inline commenting that syncs back to real GitHub PR review comments.

Design doc: https://docs.google.com/document/d/15y-mLbUfPag8fswUsVP0ymF04DqCmJeYELQBDdkei7k/edit

## Key Decisions from the Spec

- **Auth:** GitHub OAuth App ("Sign in with GitHub"), not a GitHub App. Scope: `repo` for private repos, `public_repo` if MVP is public-only.
- **Access check:** Attempt `GET /repos/{owner}/{repo}/pulls/{pull_number}` with the user's token. 403/404 = denied. No reimplementing GitHub's permission model.
- **Markdown only (MVP):** Only `.md` / `.markdown` files get the full diff + comment UI. Non-markdown files show a placeholder with a link out to GitHub.
- **Diff granularity:** Line-level, standard git unified diff. No word/AST diffing in MVP.
- **Diff source:** `GET /repos/{owner}/{repo}/pulls/{pull_number}/files` → `patch` field per file.
- **Comment anchoring:** Resolve highlight to `{ path, line, side }`. `side: "RIGHT"` for added/context, `side: "LEFT"` for removed. Multi-line: also set `start_line` / `start_side`.
- **Comment posting:** Immediate single-comment mode (`POST .../pulls/{pull_number}/comments`). `commit_id` = current head SHA.
- **GitHub as source of truth for comments:** Fetch on page load, no local store.
- **Cache:** PR file list/diff keyed by `(repo, pr_number, head_sha)`. Invalidate on manual refresh.
- **Conflict banner:** Show if `mergeable_state === "dirty"`. If `mergeable === null`, don't show yet (async compute on GitHub's side).
- **No auto-refresh:** Manual refresh only. Stale comment positions after refresh are acceptable per spec.

## Out of Scope (MVP)

- Three-way merge conflict simulation/rendering
- In-app rendering of non-markdown files
- Real-time updates / webhooks
- Approve / Request Changes review states
- GitHub App (fine-grained permissions)

## PR Sequence

See `PR-plan.md` for the full breakdown. PRs are in strict dependency order:
1. Scaffold & OAuth
2. PR Access Check & Entry UI
3. File List Sidebar
4. Diff Parsing & Markdown Renderer
5. Inline Commenting & GitHub Sync
6. Manual Refresh

## Git & GitHub

- All commits go under the user's own GitHub account (not any bot or secondary account).
- Feedback arrives via GitHub PR reviews.
- Style preferences are in `style-reqs.md`.
