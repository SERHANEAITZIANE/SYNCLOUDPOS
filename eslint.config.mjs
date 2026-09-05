// Flat config. Next 16 removed `next lint`, which used to supply this implicitly.
// eslint-config-next@16 exports flat-config arrays directly, so no FlatCompat shim.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default [
    {
        ignores: [
            "node_modules/**",
            ".next/**",
            "next-env.d.ts",
            "prisma/dist/**",
            // The Expo apps carry their own toolchains and tsconfigs.
            "syncloud-gerant/**",
            "syncloud-tournee/**",
            ".claude/**",
        ],
    },
    ...nextCoreWebVitals,
    ...nextTypescript,
    {
        rules: {
            // tsconfig.json runs with strict:false and noImplicitAny:false, so treating
            // `any` as a hard error contradicts the strictness this project has chosen.
            // Kept as a warning so new occurrences are still surfaced.
            "@typescript-eslint/no-explicit-any": "warn",
            // The UI copy is French: apostrophes in "l'article" / "d'achat" are correct
            // content, not unescaped markup. This rule fires ~150 times on valid text.
            "react/no-unescaped-entities": "off",
        },
    },
    {
        // Node-side tooling, generated bundles, and the root-level ad-hoc debug
        // scripts (check-*.js and friends) legitimately use CommonJS require().
        // `*.js` without a leading **/ matches root-level files only.
        files: [
            "scripts/**",
            "scratch/**",
            "prisma/**",
            "*.js",
            "*.config.js",
            "*.config.mjs",
            "**/*.cjs",
        ],
        rules: {
            "@typescript-eslint/no-require-imports": "off",
            "@typescript-eslint/no-unused-vars": "off",
        },
    },
    {
        // React Compiler rules shipped in eslint-plugin-react-hooks v7. This codebase
        // predates them and each hit needs a considered per-component refactor, so they
        // stay visible as warnings rather than blocking the build.
        rules: {
            "react-hooks/set-state-in-effect": "warn",
            "react-hooks/preserve-manual-memoization": "warn",
            "react-hooks/static-components": "warn",
            "react-hooks/purity": "warn",
            "react-hooks/immutability": "warn",
        },
    },
];
