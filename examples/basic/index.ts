import {AdamantApi} from 'adamant-api';

const nodes = [
  'https://endless.adamant.im',
  'https://clown.adamant.im',
  'http://23.226.231.225:36666',
  'http://88.198.156.44:36666',
  'https://lake.adamant.im',
];

const api = new AdamantApi({
  nodes,
});

/**
 * Make sure we are using active node with least ping
 */
api.onReady(async () => {
  /**
   * Use API bind to make request, alternative you can use:
   * ```js
   * const response = await api.get('peers/version');
   * ```
   */
  const response = await api.getNodeVersion();

  if (!response.success) {
    console.log(`Something bad happened: ${response.errorMessage}`);
    return;
  }

  const {version} = response;

  console.log(`Connected node is using ADAMANT v${version}`);
});
