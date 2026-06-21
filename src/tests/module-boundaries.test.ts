import {execFileSync} from 'node:child_process';
import path from 'node:path';

describe('package module boundaries', () => {
  test('loading the root entry point does not load coin implementations', () => {
    const projectRoot = path.resolve(__dirname, '../..');
    const loadedCoinModules = execFileSync(
      process.execPath,
      [
        '-e',
        "require('./dist'); console.log(Object.keys(require.cache).filter((file) => /[\\\\/]dist[\\\\/]coins[\\\\/]/.test(file)).join('\\n'))",
      ],
      {cwd: projectRoot, encoding: 'utf8'},
    ).trim();

    expect(loadedCoinModules).toBe('');
  });

  test('the root entry point does not expose coin helpers', () => {
    const projectRoot = path.resolve(__dirname, '../..');
    const rootCoinExports = execFileSync(
      process.execPath,
      [
        '-e',
        "const root = require('adamant-api'); console.log(['btc', 'eth', 'dash', 'doge'].filter((name) => name in root).join(','))",
      ],
      {cwd: projectRoot, encoding: 'utf8'},
    ).trim();

    expect(rootCoinExports).toBe('');
  });

  test('the aggregate coin entry point is not exported', () => {
    const projectRoot = path.resolve(__dirname, '../..');
    const errorCode = execFileSync(
      process.execPath,
      [
        '-e',
        "try { require('adamant-api/coins'); process.exit(1); } catch (error) { console.log(error.code); }",
      ],
      {cwd: projectRoot, encoding: 'utf8'},
    ).trim();

    expect(errorCode).toBe('ERR_PACKAGE_PATH_NOT_EXPORTED');
  });

  test.each(['btc', 'eth', 'dash', 'doge'])(
    'loads the %s helper through its package subpath',
    symbol => {
      const projectRoot = path.resolve(__dirname, '../..');
      const exports = execFileSync(
        process.execPath,
        [
          '-e',
          `console.log(Object.keys(require('adamant-api/coins/${symbol}')).join(','))`,
        ],
        {cwd: projectRoot, encoding: 'utf8'},
      ).trim();

      expect(exports).toBe(symbol);
    },
  );
});
