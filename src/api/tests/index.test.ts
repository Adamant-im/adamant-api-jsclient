import axios, {AxiosError} from 'axios';
import {AdamantApi} from '..';
import {bytesToHex} from '../../helpers/encryptor';
import {createKeypairFromPassphrase} from '../../helpers/keys';
import {MessageType} from '../../helpers/constants';

jest.mock('axios', () => {
  const actual = jest.requireActual<typeof import('axios')>('axios');
  return {...actual, __esModule: true, default: jest.fn()};
});

const request = jest.mocked(axios);
const passphrase =
  'learn arch equip tenant cause can brief brisk rich betray arrest damage';
const recipientPublicKey = bytesToHex(
  createKeypairFromPassphrase(
    'mirror noble ocean piano quantum river silver tiger unity velvet willow xenon',
  ).publicKey,
);

const createApi = (maxRetries = 0) =>
  new AdamantApi({
    nodes: ['https://node.example'],
    checkHealthAtStartup: false,
    maxRetries,
    logger: {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      log: jest.fn(),
    },
  });

describe('AdamantApi HTTP requests', () => {
  beforeEach(() => request.mockReset());

  test('sends GET parameters and POST data to the active node', async () => {
    const api = createApi();
    request.mockResolvedValue({data: {success: true, value: 1}});
    await expect(api.get('example', {q: 'x'})).resolves.toMatchObject({
      success: true,
    });
    expect(request).toHaveBeenLastCalledWith({
      method: 'GET',
      url: 'https://node.example/api/example',
      params: {q: 'x'},
    });

    await api.post('example', {value: 2});
    expect(request).toHaveBeenLastCalledWith({
      method: 'POST',
      url: 'https://node.example/api/example',
      data: {value: 2},
    });
  });

  test('refreshes nodes and retries Axios failures', async () => {
    const api = createApi(1);
    jest.spyOn(api, 'updateNodes').mockResolvedValue();
    request
      .mockRejectedValueOnce(new AxiosError('offline'))
      .mockResolvedValueOnce({data: {success: true}});
    await expect(api.get('status')).resolves.toEqual({success: true});
    expect(api.updateNodes).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(2);
  });

  test('returns structured errors for exhausted Axios and unexpected failures', async () => {
    const api = createApi();
    request.mockRejectedValueOnce(new AxiosError('offline'));
    await expect(api.get('status')).resolves.toEqual({
      success: false,
      errorMessage: 'AxiosError: offline.',
    });

    request.mockRejectedValueOnce(new Error('boom'));
    await expect(api.get('status')).resolves.toEqual({
      success: false,
      errorMessage: 'Error: boom',
    });
  });

  test('expands aggregate connection failures into actionable errors', async () => {
    const api = createApi();
    const ipv6Error = new Error('connect ECONNREFUSED ::1:36666');
    const ipv4Error = new Error('connect ECONNREFUSED 127.0.0.1:36666');
    const aggregateError = Object.assign(new Error(), {
      name: 'AggregateError',
      errors: [ipv6Error, ipv4Error],
    });
    request.mockRejectedValueOnce(
      AxiosError.from(aggregateError, 'ECONNREFUSED'),
    );

    await expect(api.get('blocks')).resolves.toEqual({
      success: false,
      errorMessage:
        'connect ECONNREFUSED ::1:36666; connect ECONNREFUSED 127.0.0.1:36666.',
    });
  });

  test('does not request a node below the minimum version', async () => {
    const api = new AdamantApi({
      nodes: ['https://old.example'],
      minVersion: '0.9.0',
      checkHealthAtStartup: false,
    });

    await api.chooseNode([
      {
        node: 'https://old.example',
        ping: 1,
        baseURL: 'old.example',
        isHttps: true,
        height: 100,
        heightEpsilon: 20,
        socketSupport: true,
        wsPort: 36667,
        version: '0.8.0',
      },
    ]);

    await expect(api.getBlocks()).resolves.toEqual({
      success: false,
      errorMessage:
        'No compatible ADAMANT nodes are available. Minimum required version is 0.9.0.',
    });
    expect(request).not.toHaveBeenCalled();
  });
});

describe('AdamantApi transaction methods', () => {
  test('creates delegate, transfer, message and vote transactions', async () => {
    const api = createApi();
    const post = jest
      .spyOn(api, 'post')
      .mockResolvedValue({success: true} as never);

    await expect(
      api.newDelegate(passphrase, 'delegate'),
    ).resolves.toMatchObject({success: true});
    await expect(
      api.sendTokens(passphrase, 'U123456', 1),
    ).resolves.toMatchObject({success: true});
    await expect(
      api.sendMessage(
        passphrase,
        recipientPublicKey,
        'hello',
        MessageType.Chat,
        1,
        true,
      ),
    ).resolves.toMatchObject({success: true});
    await expect(
      api.voteForDelegate(passphrase, [`+${recipientPublicKey}`]),
    ).resolves.toMatchObject({success: true});

    expect(post.mock.calls.map(([endpoint]) => endpoint)).toEqual([
      'delegates',
      'transactions/process',
      'transactions/process',
      'accounts/delegates',
    ]);
  });

  test('validates transaction inputs before signing or broadcasting', async () => {
    const api = createApi();
    const post = jest
      .spyOn(api, 'post')
      .mockResolvedValue({success: true} as never);
    await expect(api.newDelegate('short', 'delegate')).resolves.toMatchObject({
      success: false,
    });
    await expect(
      api.newDelegate(passphrase, 'INVALID NAME'),
    ).resolves.toMatchObject({success: false});
    expect(api.sendTokens('short', 'U123456', 1)).toMatchObject({
      success: false,
    });
    expect(api.sendTokens(passphrase, 'invalid', 1)).toMatchObject({
      success: false,
    });
    await expect(
      api.sendMessage(passphrase, 'invalid', 'hello'),
    ).resolves.toMatchObject({success: false});
    await expect(api.voteForDelegate('short', [])).resolves.toMatchObject({
      success: false,
    });
    expect(post).not.toHaveBeenCalled();
  });

  test('fetches and caches public keys and reports lookup failures', async () => {
    const api = createApi();
    const get = jest.spyOn(api, 'get');
    get.mockResolvedValueOnce({
      success: true,
      publicKey: recipientPublicKey,
    } as never);
    await expect(api.getPublicKey('U111111')).resolves.toBe(recipientPublicKey);
    await expect(api.getPublicKey('U111111')).resolves.toBe(recipientPublicKey);
    expect(get).toHaveBeenCalledTimes(1);

    get.mockResolvedValueOnce({
      success: false,
      errorMessage: 'missing',
    } as never);
    await expect(api.getPublicKey('U222222')).resolves.toBe('');
  });

  test('resolves address votes through the delegate list', async () => {
    const api = createApi();
    jest.spyOn(api, 'getDelegates').mockResolvedValue({
      success: true,
      delegates: [{address: 'U333333', publicKey: recipientPublicKey}],
    } as never);
    const post = jest
      .spyOn(api, 'post')
      .mockResolvedValue({success: true} as never);
    await expect(
      api.voteForDelegate(passphrase, ['+U333333']),
    ).resolves.toMatchObject({success: true});
    expect(post).toHaveBeenCalledWith(
      'accounts/delegates',
      expect.objectContaining({type: 3}),
    );
  });
});

describe('AdamantApi query methods', () => {
  test('forwards every query method to the documented endpoint', async () => {
    const api = createApi();
    const get = jest
      .spyOn(api, 'get')
      .mockResolvedValue({success: true} as never);
    const calls: Array<() => Promise<unknown>> = [
      () => api.getAccountInfo({address: 'U123456'}),
      () => api.getAccountBalance('U123456'),
      () => api.getBlock('block'),
      () => api.getBlocks({limit: 1}),
      () => api.getChats('U123456', {or: {type: 0}}),
      () => api.getChatMessages('U123456', 'U654321', {and: {limit: 1}}),
      () => api.getDelegates({limit: 1}),
      () => api.getDelegate({username: 'delegate'}),
      () => api.searchDelegates('del'),
      () => api.getDelegatesCount(),
      () => api.getDelegateStats(recipientPublicKey),
      () => api.getNextForgers(10),
      () => api.getVoters(recipientPublicKey),
      () => api.getVoteData('U123456'),
      () => api.getPeers(),
      () => api.getLoadingStatus(),
      () => api.getSyncStatus(),
      () => api.getPingStatus(),
      () => api.getNodeVersion(),
      () => api.getBroadhash(),
      () => api.getEpoch(),
      () => api.getHeight(),
      () => api.getFee(),
      () => api.getFees(),
      () => api.getNethash(),
      () => api.getMilestone(),
      () => api.getReward(),
      () => api.getSupply(),
      () => api.getStatus(),
      () => api.getNodeStatus(),
      () => api.getTransactions({or: {senderId: 'U123456'}}),
      () => api.getTransaction('transaction', {and: {returnAsset: 1}}),
      () => api.getTransactionsCount(),
      () => api.getQueuedTransactions(),
      () => api.getQueuedTransaction('transaction'),
      () => api.getUnconfirmedTransactions(),
      () => api.getUnconfirmedTransaction('transaction'),
    ];
    await Promise.all(calls.map(call => call()));

    expect(get.mock.calls.map(([endpoint]) => endpoint)).toEqual([
      'accounts',
      'accounts/getBalance',
      'blocks/get',
      'blocks',
      'chatrooms/U123456',
      'chatrooms/U123456/U654321',
      'delegates',
      'delegates/get',
      'delegates/search',
      'delegates/count',
      'delegates/forging/getForgedByAccount',
      'delegates/getNextForgers',
      'delegates/voters',
      'accounts/delegates',
      'peers',
      'loader/status',
      'loader/status/sync',
      'loader/status/ping',
      'peers/version',
      'blocks/getBroadhash',
      'blocks/getEpoch',
      'blocks/getHeight',
      'blocks/getFee',
      'blocks/getFees',
      'blocks/getNethash',
      'blocks/getMilestone',
      'blocks/getReward',
      'blocks/getSupply',
      'blocks/getStatus',
      'node/status',
      'transactions',
      'transactions/get',
      'transactions/count',
      'transactions/queued',
      'transactions/queued/get',
      'transactions/unconfirmed',
      'transactions/unconfirmed/get',
    ]);
  });
});
