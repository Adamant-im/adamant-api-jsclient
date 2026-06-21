import {AdamantApi} from 'adamant-api';

console.log('\nESM live consumer started.');

const api = new AdamantApi({
  nodes: [
    'http://localhost:36666',
    'https://endless.adamant.im',
    'https://clown.adamant.im',
    'https://lake.adamant.im',
  ],
  checkHealthAtStartup: true,
  minVersion: '0.9.0',
});

await new Promise<void>(resolve => api.onReady(resolve));

const response = await api.getBlocks();

if (response.success) {
  console.log(response.blocks[0]);
} else {
  console.error(response.errorMessage);
}

console.log('\nESM live consumer finished.');
