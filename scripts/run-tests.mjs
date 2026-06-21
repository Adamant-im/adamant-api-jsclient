import {spawn} from 'node:child_process';

const requestedArguments = process.argv.slice(2);
const jestArguments = requestedArguments.length
  ? ['--coverage=false', ...requestedArguments]
  : [];

const exitCode = await new Promise((resolve, reject) => {
  const child = spawn('jest', jestArguments, {stdio: 'inherit'});

  child.once('error', reject);
  child.once('exit', (code, signal) => {
    if (signal) {
      reject(new Error(`Jest exited with signal ${signal}`));
      return;
    }

    resolve(code ?? 1);
  });
});

process.exitCode = exitCode;
