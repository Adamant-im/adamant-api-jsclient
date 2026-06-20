/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/tests/**',
    '!src/api/generated.ts',
    '!src/index.ts',
    '!src/adm/index.ts',
  ],
  coverageThreshold: {
    global: {
      functions: 100,
    },
  },
};
