// @ts-check
/**
 * Collection War — root ESLint flat configuration.
 *
 * This is the single lint configuration for the whole monorepo. Individual apps and
 * packages do NOT ship their own; they inherit from here, so there is one source of truth
 * for the architectural rules described in docs/architecture/DEPENDENCY_RULES.md.
 *
 * Sections:
 *   1. Global ignores
 *   2. Baseline rules for everything
 *   3. Architectural layer boundaries  ← the important part
 *   4. Per-surface overrides (clients, servers, tests, tooling)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY NOT eslint-plugin-boundaries?
 *
 * It was tried and REMOVED. In a pnpm workspace every cross-layer import is a package
 * specifier (`@collection-war/domain`), not a relative path, and the plugin could not map
 * those specifiers back to local elements without an import resolver. The result was a
 * rule that reported nothing and looked like it was working — verified by deliberately
 * importing the domain from a leaf package and seeing zero errors.
 *
 * A boundary rule that silently passes is worse than no rule, because it is trusted.
 *
 * `no-restricted-imports` matches on the specifier itself, needs no resolver, and was
 * verified to fire for every layer below. Since our layers ARE packages, it expresses the
 * same constraint with fewer moving parts. See docs/adr/ADR-0014.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';

const DOCS = 'docs/architecture/DEPENDENCY_RULES.md';

/** Storage, queue and server-framework modules. Reaching these from a client is a security bug. */
const SERVER_ONLY = [
  'pg',
  'ioredis',
  'bullmq',
  'drizzle-orm',
  'drizzle-orm/*',
  '@collection-war/database',
  '@nestjs/*',
  'fastify',
  '@fastify/*',
];

/** UI and presentation modules. A server or domain package importing these is an architecture bug. */
const CLIENT_ONLY = [
  'react',
  'react-dom',
  'react-native',
  'react-native/*',
  'next',
  'next/*',
  'expo',
  'expo/*',
  'expo-*',
  '@collection-war/design-system',
];

/** Everything a leaf utility package must not reach "upwards" into. */
const INNER_LAYERS = [
  '@collection-war/domain',
  '@collection-war/battle-engine',
  '@collection-war/economy',
  '@collection-war/database',
  '@collection-war/api-client',
  '@collection-war/design-system',
];

/**
 * Builds a `no-restricted-imports` entry with an explanation the reader can act on.
 *
 * The lists above overlap deliberately (a design system is both "client-only" and an
 * "inner layer" from a leaf package's point of view), and ESLint's schema rejects
 * duplicate patterns outright — so they are de-duplicated here rather than requiring every
 * call site to keep the lists disjoint.
 */
function forbid(groups, message) {
  return ['error', { patterns: [{ group: [...new Set(groups)], message: `${message} See ${DOCS}.` }] }];
}

export default tseslint.config(
  // ---------------------------------------------------------------- 1. ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.expo/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/*.tsbuildinfo',
      '**/drizzle/**',
      'docs/generated/**',
      'pnpm-lock.yaml',
    ],
  },

  // ------------------------------------------------------- 2. baseline for all
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2023 },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      // `any` erases exactly the guarantees this project relies on for economy and battle
      // correctness. An error, overridable per-line with a written reason.
      '@typescript-eslint/no-explicit-any': 'error',

      // `console` is not structured logging. Use @collection-war/observability.
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-implicit-coercion': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': ['error', 'properties'],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },

  // ================================================ 3. ARCHITECTURAL BOUNDARIES

  // 3a. Client applications must not reach storage, queues or the server framework.
  {
    files: ['apps/web/**/*.{ts,tsx}', 'apps/admin/**/*.{ts,tsx}', 'apps/mobile/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': forbid(
        SERVER_ONLY,
        'Client applications talk to the server only through @collection-war/api-client. Importing storage or server frameworks would put credentials in a client bundle.',
      ),
    },
  },

  // 3b. Server applications must not import UI or presentation packages.
  {
    files: ['apps/api/**/*.ts', 'apps/workers/**/*.ts'],
    rules: {
      'no-restricted-imports': forbid(
        [...CLIENT_ONLY, '@collection-war/api-client'],
        'Server applications render nothing and must not call themselves through the client SDK.',
      ),
    },
  },

  // 3c. Domain packages: the innermost layer. Framework-, transport- and storage-free.
  {
    files: ['packages/domain/**/*.ts', 'packages/battle-engine/**/*.ts', 'packages/economy/**/*.ts'],
    rules: {
      'no-restricted-imports': forbid(
        [...SERVER_ONLY, ...CLIENT_ONLY, '@collection-war/api-client'],
        'Domain packages must stay framework-, transport- and storage-independent so they remain deterministic and testable without I/O.',
      ),
    },
  },

  // 3d. Determinism, enforced where it matters.
  {
    files: ['packages/domain/**/*.ts', 'packages/battle-engine/**/*.ts', 'packages/economy/**/*.ts'],
    ignores: [
      // The sanctioned IMPLEMENTATIONS of the abstractions these rules force on everyone
      // else. Something has to read the clock and produce pseudo-randomness; the rule is
      // that it happens in exactly these two audited files.
      'packages/domain/src/clock.ts',
      'packages/domain/src/random.ts',
      '**/*.test.ts',
    ],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'Date',
          message:
            'Inject a Clock. Domain outcomes must be reproducible and replayable — see docs/domains/battle/README.md.',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message:
            'Inject a seeded RandomSource. Battle and reward outcomes must be reproducible and server-authoritative.',
        },
      ],
    },
  },

  // 3e. The database package may know SQL, but not React and not the client SDK.
  {
    files: ['packages/database/**/*.ts'],
    rules: {
      'no-restricted-imports': forbid(
        [...CLIENT_ONLY, '@collection-war/api-client'],
        'The database package implements interfaces the domain declares. It has no presentation concerns.',
      ),
    },
  },

  // 3f. Leaf utility packages depend on nothing above them. This is what stops the
  //     shared layer quietly becoming a second domain layer.
  {
    files: [
      'packages/shared-types/**/*.ts',
      'packages/validation/**/*.ts',
      'packages/localization/**/*.ts',
      'packages/configuration/**/*.ts',
      'packages/analytics-events/**/*.ts',
      'packages/observability/**/*.ts',
      'packages/testing/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': forbid(
        [...INNER_LAYERS, ...SERVER_ONLY.filter((m) => m !== '@collection-war/database'), ...CLIENT_ONLY],
        'Leaf packages sit at the bottom of the dependency graph. Importing an inner layer here creates a cycle and makes the shared layer un-shareable.',
      ),
    },
  },

  // 3g. Client-support packages may present and transport, but never persist.
  {
    files: ['packages/api-client/**/*.ts', 'packages/design-system/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': forbid(
        SERVER_ONLY,
        'The API client and design system run inside a browser or a phone. They must never reach storage.',
      ),
    },
  },

  // ============================================= 4. PER-SURFACE CONFIGURATION

  // 4a. React client applications and the design system.
  {
    files: [
      'apps/web/**/*.{ts,tsx}',
      'apps/admin/**/*.{ts,tsx}',
      'apps/mobile/**/*.{ts,tsx}',
      'packages/design-system/**/*.tsx',
    ],
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
    },
  },

  // 4b. Server applications.
  {
    files: ['apps/api/**/*.ts', 'apps/workers/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',

      /**
       * MUST stay off for server applications.
       *
       * NestJS resolves constructor dependencies from `design:paramtypes` metadata that
       * TypeScript emits from the constructor's type annotations. A class used only as a
       * constructor parameter type LOOKS type-only to the linter, but rewriting its import
       * to `import type` erases it from the emitted metadata — and every injected
       * dependency silently arrives `undefined` at runtime.
       */
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },

  // 4c. Tests. Boundary and determinism rules are relaxed so a test can construct
  //     whatever it needs to exercise the rule it is testing.
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/tests/**/*.{ts,tsx}', '**/test-stubs/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
      'no-restricted-imports': 'off',
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
    },
  },

  // 4d. Repository tooling: CLI scripts and build configuration.
  {
    files: ['**/scripts/**/*.mjs', '*.config.{mjs,ts,js}', '**/*.config.{mjs,ts,js}'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      // A CLI script's entire output IS console output. Routing it through the structured
      // logger would make it unreadable for the human running the command.
      'no-console': 'off',
      'no-restricted-imports': 'off',
      // Metro and Babel load their config with CommonJS `require`; they cannot be ESM.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Must stay last: turns off every rule Prettier owns.
  prettier,
);
