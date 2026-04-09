import eslintConfigPrettier from "eslint-config-prettier/flat"
import { defineConfig } from "eslint/config"
import neostandard from "neostandard"

export default defineConfig([
  ...neostandard({
    ts: true,
    files: ["**/*.{js,jsx}", "**/*.mjs"],
    filesTs: ["**/*.{ts,tsx}"],
    ignores: ["**/node_modules/**", "dist/**"],
  }),
  eslintConfigPrettier,
  { linterOptions: { reportUnusedDisableDirectives: "warn" } },
])
