// Maps file extensions to highlight.js language names.
// Only common languages are listed; unknown extensions fall back to plaintext.

const EXT_TO_LANGUAGE: Record<string, string> = {
  // Web
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  html: "xml",
  htm: "xml",
  css: "css",
  scss: "scss",
  less: "less",
  json: "json",
  jsonc: "json",
  graphql: "graphql",
  gql: "graphql",

  // Systems
  c: "c",
  cpp: "cpp",
  cc: "cpp",
  h: "c",
  hpp: "cpp",
  rs: "rust",
  go: "go",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  cs: "csharp",

  // Scripting
  py: "python",
  rb: "ruby",
  php: "php",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "bash",

  // Config / data
  yaml: "yaml",
  yml: "yaml",
  toml: "ini",
  xml: "xml",
  sql: "sql",
  dockerfile: "dockerfile",

  // Docs (non-markdown — markdown is handled separately)
  tex: "latex",
};

// Returns the highlight.js language string for a given filename, or null if unknown.
export function getFileLanguage(filename: string): string | null {
  const lower = filename.toLowerCase();
  const ext = lower.split(".").pop() ?? "";

  // Special-case filenames without extensions (Dockerfile, Makefile, etc.)
  const basename = lower.split("/").pop() ?? lower;
  if (basename === "dockerfile") return "dockerfile";
  if (basename === "makefile") return "makefile";

  return EXT_TO_LANGUAGE[ext] ?? null;
}
