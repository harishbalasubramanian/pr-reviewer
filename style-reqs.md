# Style Requirements

Personal coding style preferences for this project. These apply across all PRs.

## Code Style

- **Maintainability over brevity.** If a shorter version is harder to follow, use the longer one.
  Readability is not just about line count — it's about how fast a future reader can understand intent.
- Don't compress logic into one-liners when a few clear lines would be more obvious.
- Prefer explicit variable names over terse abbreviations.

## Comments

- Comments should be short and lean — no padding, no restating what the code already says.
- A good comment adds context that can't be inferred from the code itself (e.g. why a decision was made, a non-obvious constraint, a gotcha).
- Write as if the reader is smart but unfamiliar with this specific code path.
- Avoid multi-line comment blocks where a single tight sentence will do.
