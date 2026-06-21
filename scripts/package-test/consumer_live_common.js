const {AdamantApi} = require('adamant-api');

console.log('\nCommonJS live consumer started.');

const api = new AdamantApi({
  nodes: [
    'http://localhost:36666',
    'https://endless.adamant.im',
    'https://clown.adamant.im',
    'https://lake.adamant.im',
  ],
  checkHealthAtStartup: true,
  minVersion: '0.8.0',
});

module.exports = new Promise(resolve => api.onReady(resolve)).then(async () => {
  const response = await api.getBlocks();

  if (response.success) {
    console.log(response.blocks[0]);
  } else {
    console.error(response.errorMessage);
  }

  console.log('\nCommonJS live consumer finished.');
});
