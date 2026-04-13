import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Project-specific rule overrides
  {
    rules: {
      // Warn (not error) when console.log is left in — console.error/warn are fine
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Catch unused variables (prefix with _ to intentionally ignore them)
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Prefer const where possible
      "prefer-const": "error",
      // Ban var — use let/const instead
      "no-var": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Don't lint generated files
    "prisma/migrations/**",
    "public/sw.js",
  ]),
]);

export default eslintConfig;
