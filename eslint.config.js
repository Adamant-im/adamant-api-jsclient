'use strict';

module.exports = [
  {
    ignores: ['dist/**', 'docs/**', 'src/api/generated.ts'],
  },
  ...require('gts'),
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './scripts/package-test/tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    files: ['**/*.test.ts', '**/tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['*.js'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
  },
  {
    files: ['scripts/package-test/consumer_live_common.js'],
    languageOptions: {
      globals: {
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
  },
];
