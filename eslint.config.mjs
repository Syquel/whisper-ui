// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import path from "node:path";
import { includeIgnoreFile } from "@eslint/compat";

const stylisticConfig = {
    "@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: true }],
    "@stylistic/comma-dangle": ["error", "never"],
    "@stylistic/semi": ["error", "always"],
    "@stylistic/indent": ["error", 4],
    "@stylistic/max-statements-per-line": ["error", { max: 2 }],
    "@stylistic/member-delimiter-style": [
        "error",
        {
            multiline: {
                delimiter: "semi"
            }
        }
    ],
    "@stylistic/operator-linebreak": ["error", "after", { overrides: { "?": "before", ":": "before" } }],
    "@stylistic/quotes": ["error", "double"]
};

export default tseslint.config(
    includeIgnoreFile(path.resolve(import.meta.dirname, ".gitignore")),
    {
        files: [
            "**/*.js",
            "**/*.[mc]js"
        ],
        extends: [
            eslint.configs.recommended,
            stylistic.configs.recommended
        ],
        rules: {
            ...stylisticConfig
        }
    },
    {
        files: [
            "**/*.ts",
            "**/*.[mc]ts"
        ],
        extends: [
            eslint.configs.recommended,
            ...tseslint.configs.strictTypeChecked,
            stylistic.configs.recommended
        ],
        languageOptions: {
            parserOptions: {
                projectService: true
            }
        },
        rules: {
            ...stylisticConfig,
            "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }]
        }
    }
);
