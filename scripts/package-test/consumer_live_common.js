const {AdamantApi} = require('adamant-api');

const api = new AdamantApi({
  nodes: [
    'http://localhost:36666',
    'https://endless.adamant.im',
    'https://clown.adamant.im',
    'https://lake.adamant.im',
  ],
  checkHealthAtStartup: true,
});

module.exports = api.getBlocks().then(response => {
  if (response.success) {
    console.log(response.blocks);
  }
});
