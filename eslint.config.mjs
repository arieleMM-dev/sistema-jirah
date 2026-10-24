import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { rules: { "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }] } },
  {
    files: ["tests/**/*.cjs", "scripts/**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "prisma/backups/**",
    // Archivos generados por Workbox: se revisan sus fuentes/configuración.
    "public/sw.js",
    "public/workbox-*.js",
    "public/worker-*.js",
    "public/swe-worker-*.js",
  ]),
]);

export default eslintConfig;
