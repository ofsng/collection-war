/**
 * Collection War — repository-wide formatting.
 *
 * Formatting is not a matter of taste here; it is a matter of diff noise. One config,
 * no per-package overrides, enforced in CI by `pnpm format:check`.
 */

/** @type {import('prettier').Config} */
export default {
  printWidth: 110,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  jsxSingleQuote: false,
  trailingComma: 'all',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',
  endOfLine: 'lf',
  overrides: [
    {
      // Documentation is read far more than it is edited. Preserve author line breaks
      // so tables and Mermaid blocks survive formatting.
      files: ['*.md'],
      options: { printWidth: 100, proseWrap: 'preserve' },
    },
    {
      files: ['*.yml', '*.yaml'],
      options: { singleQuote: false },
    },
  ],
};
