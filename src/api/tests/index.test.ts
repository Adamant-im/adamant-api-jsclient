import axios, {AxiosError} from 'axios';
import * as apiModule from '..';
import {AdamantApi} from '..';
import {unsupportedOrQueryResult} from '../utils';
import {
  clearPublicKeysCache,
  type DelegateCaches,
  publicKeysCache,
} from '../publicKeyCache';
import statesGetPlainFilters from './fixtures/states-get-plain-filters.json';
import {bytesToHex, decodeMessage} from '../../helpers/encryptor';
import {
  createAddressFromPublicKey,
  createKeypairFromPassphrase,
} from '../../helpers/keys';
import {MessageType} from '../../helpers/constants';

jest.mock('axios', () => {
  const actual = jest.requireActual<typeof import('axios')>('axios');
  return {...actual, __esModule: true, default: jest.fn()};
});

const request = jest.mocked(axios);
const passphrase =
  'learn arch equip tenant cause can brief brisk rich betray arrest damage';
const recipientPassphrase =
  'mirror noble ocean piano quantum river silver tiger unity velvet willow xenon';
const recipientKeyPair = createKeypairFromPassphrase(recipientPassphrase);
const recipientPublicKey = bytesToHex(recipientKeyPair.publicKey);
const recipientAddress = createAddressFromPublicKey(recipientPublicKey);
const otherRecipientKeyPair = createKeypairFromPassphrase(
  'apple banana cherry date elderberry fig grape hazelnut iris juniper kiwi lemon',
);
const otherRecipientPublicKey = bytesToHex(otherRecipientKeyPair.publicKey);
const otherRecipientAddress = createAddressFromPublicKey(
  otherRecipientPublicKey,
);
const offCurvePublicKey = `02${'00'.repeat(31)}`;
const nonCanonicalPublicKey = 'ff'.repeat(32);
const smallOrderPublicKey =
  'c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac037a';
const createLogger = () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  log: jest.fn(),
});

const createApi = (maxRetries = 0) =>
  new AdamantApi({
    nodes: ['https://node.example'],
    checkHealthAtStartup: false,
    maxRetries,
    logger: createLogger(),
  });

describe('AdamantApi public utility exports', () => {
  test('re-exports public query and vote utilities without leaking internal helpers', () => {
    expect(apiModule.isVoteDirection('+')).toBe(true);
    expect(apiModule.parseVote('+delegate')).toEqual(['delegate', '+']);
    expect(
      apiModule.getUnsupportedTransactionQueryControls(
        {returnAsset: 1},
        'chats',
      ),
    ).toEqual(['returnAsset']);
    expect(
      apiModule.hasMixedTransactionQueryGroups({
        type: 8,
        or: {senderId: 'U111'},
      }),
    ).toBe(true);
    expect(
      apiModule.transformTransactionQuery({senderId: 'U111'}, 'states'),
    ).toEqual({senderId: 'U111'});

    expect('unsupportedOrQueryResult' in apiModule).toBe(false);
    expect('getUnsupportedTransactionQueryControlWarning' in apiModule).toBe(
      false,
    );
    expect('publicKeysCache' in apiModule).toBe(false);
    expect('cacheVerifiedPublicKey' in apiModule).toBe(false);
  });
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

  test.each([
    [{success: false, errorMessage: 'Canonical error'}, 'Canonical error'],
    [{success: false, error: 'Legacy node error'}, 'Legacy node error'],
    [{success: false, message: 'Node message'}, 'Node message'],
    [
      {success: false},
      'ADAMANT Node returned an unsuccessful response without an error message',
    ],
  ])(
    'normalizes unsuccessful HTTP 200 responses to errorMessage',
    async (data, errorMessage) => {
      const api = createApi();
      request.mockResolvedValueOnce({data});

      await expect(api.get('example')).resolves.toEqual({
        success: false,
        errorMessage,
      });
    },
  );

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

  test('retries only requests that are safe to replay', async () => {
    const api = createApi(1);
    jest.spyOn(api, 'updateNodes').mockResolvedValue();

    request.mockRejectedValueOnce(
      new AxiosError('server error', undefined, undefined, undefined, {
        status: 500,
        data: {error: 'Invalid transaction'},
      } as never),
    );
    await expect(api.post('transactions', {})).resolves.toEqual({
      success: false,
      errorMessage: 'Invalid transaction.',
    });
    expect(request).toHaveBeenCalledTimes(1);

    request.mockRejectedValueOnce(
      new AxiosError('bad request', undefined, undefined, undefined, {
        status: 400,
      } as never),
    );
    await api.get('transactions');
    expect(request).toHaveBeenCalledTimes(2);

    request.mockRejectedValueOnce(
      new AxiosError('server error', undefined, undefined, undefined, {
        status: 500,
        data: {error: 'Invalid query'},
      } as never),
    );
    await expect(api.get('transactions')).resolves.toEqual({
      success: false,
      errorMessage: 'Invalid query.',
    });
    expect(request).toHaveBeenCalledTimes(3);

    request
      .mockRejectedValueOnce(
        new AxiosError('server error', undefined, undefined, undefined, {
          status: 503,
        } as never),
      )
      .mockResolvedValueOnce({data: {success: true}});
    await expect(api.get('transactions')).resolves.toEqual({success: true});
    expect(request).toHaveBeenCalledTimes(5);
    expect(api.updateNodes).toHaveBeenCalledTimes(1);
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
      logger: createLogger(),
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

  test('fails over to another node immediately on GET HTTP 429', async () => {
    const logger = createLogger();
    const api = new AdamantApi({
      nodes: ['https://node1.example', 'https://node2.example'],
      checkHealthAtStartup: false,
      maxRetries: 1,
      logger,
    });
    jest.spyOn(api, 'updateNodes').mockImplementation(async () => {
      api.node = 'https://node2.example';
    });
    request
      .mockRejectedValueOnce(
        new AxiosError('too many requests', undefined, undefined, undefined, {
          status: 429,
          headers: {
            'retry-after': '15',
            'ratelimit-scope': 'read',
          },
          data: {
            success: false,
            error: 'Too many requests, please try again later.',
          },
        } as never),
      )
      .mockResolvedValueOnce({data: {success: true, count: 1}});

    await expect(api.get('blocks')).resolves.toEqual({success: true, count: 1});
    expect(api.updateNodes).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenLastCalledWith({
      method: 'GET',
      url: 'https://node2.example/api/blocks',
      params: undefined,
    });
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('HTTP 429 (scope: read, retry after: 15s)'),
    );
  });

  test('switches immediately to a cached synced node on multi-node GET HTTP 429 without running a health sweep', async () => {
    const logger = createLogger();
    const api = new AdamantApi({
      nodes: ['https://node1.example', 'https://node2.example'],
      checkHealthAtStartup: false,
      maxRetries: 1,
      logger,
    });
    await api.chooseNode([
      {
        node: 'https://node1.example',
        ping: 1,
        baseURL: 'node1.example',
        ip: '192.0.2.1',
        isHttps: true,
        height: 100,
        heightEpsilon: 20,
        socketSupport: true,
        wsPort: 36667,
        version: '0.11.0',
      },
      {
        node: 'https://node2.example',
        ping: 5,
        baseURL: 'node2.example',
        ip: '192.0.2.2',
        isHttps: true,
        height: 100,
        heightEpsilon: 20,
        socketSupport: true,
        wsPort: 36667,
        version: '0.11.0',
      },
    ]);
    api.node = 'https://node1.example';

    const updateSpy = jest.spyOn(api, 'updateNodes');
    const checkNodesSpy = jest.spyOn(api, 'checkNodes');
    request
      .mockRejectedValueOnce(
        new AxiosError('too many requests', undefined, undefined, undefined, {
          status: 429,
          headers: {
            'retry-after': '15',
            'ratelimit-scope': 'read',
          },
          data: {
            success: false,
            error: 'Too many requests, please try again later.',
          },
        } as never),
      )
      .mockResolvedValueOnce({data: {success: true, count: 2}});

    await expect(api.get('blocks')).resolves.toEqual({success: true, count: 2});
    expect(updateSpy).not.toHaveBeenCalled();
    expect(checkNodesSpy).not.toHaveBeenCalled();
    expect(api.node).toBe('https://node2.example');
    expect(request).toHaveBeenLastCalledWith({
      method: 'GET',
      url: 'https://node2.example/api/blocks',
      params: undefined,
    });
  });

  test('waits bounded Retry-After on single-node GET HTTP 429 without triggering a health sweep', async () => {
    jest.useFakeTimers();
    const random = jest.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const api = createApi(1);
      const updateSpy = jest.spyOn(api, 'updateNodes').mockResolvedValue();
      request
        .mockRejectedValueOnce(
          new AxiosError('too many requests', undefined, undefined, undefined, {
            status: 429,
            headers: {
              'retry-after': '2',
              'ratelimit-scope': 'read',
            },
            data: {
              success: false,
              error: 'Too many requests, please try again later.',
            },
          } as never),
        )
        .mockResolvedValueOnce({data: {success: true}});

      const pending = api.get('blocks');
      await jest.advanceTimersByTimeAsync(2000);

      await expect(pending).resolves.toEqual({success: true});
      expect(updateSpy).not.toHaveBeenCalled();
      expect(request).toHaveBeenCalledTimes(2);
    } finally {
      random.mockRestore();
      jest.useRealTimers();
    }
  });

  test('supports RateLimit-Reset and HTTP-date Retry-After headers on GET HTTP 429', async () => {
    jest.useFakeTimers();
    const random = jest.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const api = createApi(1);
      jest.spyOn(api, 'updateNodes').mockResolvedValue();
      request
        .mockRejectedValueOnce(
          new AxiosError('too many requests', undefined, undefined, undefined, {
            status: 429,
            headers: {
              'ratelimit-reset': '1',
            },
            data: {
              success: false,
              error: 'Too many requests, please try again later.',
            },
          } as never),
        )
        .mockResolvedValueOnce({data: {success: true}});

      const pending = api.get('blocks');
      await jest.advanceTimersByTimeAsync(1000);
      await expect(pending).resolves.toEqual({success: true});

      const futureDate = new Date(Date.now() + 1000).toUTCString();
      request
        .mockRejectedValueOnce(
          new AxiosError('too many requests', undefined, undefined, undefined, {
            status: 429,
            headers: {
              'retry-after': futureDate,
            },
            data: {
              success: false,
              error: 'Too many requests, please try again later.',
            },
          } as never),
        )
        .mockResolvedValueOnce({data: {success: true}});

      const pendingDate = api.get('blocks');
      await jest.advanceTimersByTimeAsync(1000);
      await expect(pendingDate).resolves.toEqual({success: true});
    } finally {
      random.mockRestore();
      jest.useRealTimers();
    }
  });

  test('returns normalized 429 error with rate-limit metadata when single-node Retry-After exceeds bounded wait', async () => {
    const api = createApi(1);
    const updateSpy = jest.spyOn(api, 'updateNodes').mockResolvedValue();
    request.mockRejectedValueOnce(
      new AxiosError('too many requests', undefined, undefined, undefined, {
        status: 429,
        headers: {
          'retry-after': '60',
          'ratelimit-scope': 'all',
        },
        data: {
          success: false,
          error: 'Too many requests, please try again later.',
        },
      } as never),
    );

    await expect(api.get('blocks')).resolves.toEqual({
      success: false,
      errorMessage: 'Too many requests, please try again later.',
      status: 429,
      retryAfterMs: 60_000,
      rateLimitScope: 'all',
    });
    expect(updateSpy).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);
  });

  test('resolves to a structured error instead of rejecting when failover encounters a malformed status payload', async () => {
    const api = new AdamantApi({
      nodes: ['https://bad-status.example', 'https://offline.example'],
      checkHealthAtStartup: false,
      maxRetries: 1,
      logger: createLogger(),
    });
    jest
      .spyOn(api, 'checkNode')
      .mockResolvedValueOnce({success: true} as never)
      .mockResolvedValueOnce({success: false} as never);
    request
      .mockRejectedValueOnce(new AxiosError('network timeout'))
      .mockRejectedValueOnce(new AxiosError('network timeout'));

    await expect(api.get('blocks')).resolves.toEqual({
      success: false,
      errorMessage: 'AxiosError: network timeout.',
    });
  });

  test('fails over both concurrent GET requests on HTTP 429 without flipping back', async () => {
    const api = new AdamantApi({
      nodes: ['https://node1.example', 'https://node2.example'],
      checkHealthAtStartup: false,
      maxRetries: 1,
      logger: createLogger(),
    });
    jest.spyOn(api, 'checkNodes').mockResolvedValue([
      {
        node: 'https://node1.example',
        ping: 1,
        baseURL: 'node1.example',
        ip: '192.0.2.1',
        isHttps: true,
        height: 100,
        heightEpsilon: 20,
        socketSupport: true,
        wsPort: 36667,
        version: '0.11.0',
      },
      {
        node: 'https://node2.example',
        ping: 5,
        baseURL: 'node2.example',
        ip: '192.0.2.2',
        isHttps: true,
        height: 100,
        heightEpsilon: 20,
        socketSupport: true,
        wsPort: 36667,
        version: '0.11.0',
      },
    ]);

    const rateLimitError = new AxiosError(
      'too many requests',
      undefined,
      undefined,
      undefined,
      {
        status: 429,
        headers: {
          'retry-after': '30',
          'ratelimit-scope': 'read',
        },
        data: {
          success: false,
          error: 'Too many requests, please try again later.',
        },
      } as never,
    );

    request.mockImplementation(((config: unknown) => {
      const url = (config as {url?: string}).url ?? '';
      if (url.startsWith('https://node1.example')) {
        return Promise.reject(rateLimitError);
      }

      return Promise.resolve({data: {success: true, from: url}});
    }) as never);

    const [first, second] = await Promise.all([
      api.get('blocks'),
      api.get('blocks'),
    ]);

    expect(first).toEqual({
      success: true,
      from: 'https://node2.example/api/blocks',
    });
    expect(second).toEqual({
      success: true,
      from: 'https://node2.example/api/blocks',
    });
    expect(api.node).toBe('https://node2.example');
    expect(api.checkNodes).toHaveBeenCalledTimes(1);
  });

  test('does not flip back when a late HTTP 429 arrives after another request already failed over', async () => {
    const api = new AdamantApi({
      nodes: ['https://node1.example', 'https://node2.example'],
      checkHealthAtStartup: false,
      maxRetries: 2,
      logger: createLogger(),
    });
    const updateSpy = jest
      .spyOn(api, 'updateNodes')
      .mockImplementation(async () => {
        api.node =
          api.node === 'https://node1.example'
            ? 'https://node2.example'
            : 'https://node1.example';
      });

    let rejectLate!: (err: unknown) => void;
    const rateLimitError = new AxiosError(
      'too many requests',
      undefined,
      undefined,
      undefined,
      {
        status: 429,
        headers: {'retry-after': '30', 'ratelimit-scope': 'read'},
        data: {
          success: false,
          error: 'Too many requests, please try again later.',
        },
      } as never,
    );

    request
      .mockRejectedValueOnce(rateLimitError)
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectLate = reject;
          }),
      )
      .mockResolvedValue({data: {success: true}});

    const reqA = api.get('blocks');
    const reqB = api.get('blocks');

    await expect(reqA).resolves.toEqual({success: true});
    expect(api.node).toBe('https://node2.example');

    rejectLate(rateLimitError);
    await expect(reqB).resolves.toEqual({success: true});
    expect(api.node).toBe('https://node2.example');
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(
      request.mock.calls.map(([c]) => (c as unknown as {url: string}).url),
    ).toEqual([
      'https://node1.example/api/blocks',
      'https://node1.example/api/blocks',
      'https://node2.example/api/blocks',
      'https://node2.example/api/blocks',
    ]);
  });

  test('does not replay POST requests on HTTP 429 and exposes rate-limit metadata', async () => {
    const api = createApi(2);
    jest.spyOn(api, 'updateNodes').mockResolvedValue();
    request.mockRejectedValueOnce(
      new AxiosError('too many requests', undefined, undefined, undefined, {
        status: 429,
        headers: {
          'retry-after': '1',
          'ratelimit-scope': 'publish',
        },
        data: {
          success: false,
          error: 'Too many requests, please try again later.',
        },
      } as never),
    );

    await expect(api.post('transactions', {})).resolves.toEqual({
      success: false,
      errorMessage: 'Too many requests, please try again later.',
      status: 429,
      retryAfterMs: 1000,
      rateLimitScope: 'publish',
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(api.updateNodes).not.toHaveBeenCalled();
  });
});

describe('AdamantApi transaction methods', () => {
  beforeEach(() => {
    clearPublicKeysCache();
  });

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
    await expect(api.newDelegate('short', 'delegate')).resolves.toEqual({
      success: false,
      errorMessage: "Wrong 'passphrase' parameter",
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
    await expect(api.createAccount('invalid')).resolves.toMatchObject({
      success: false,
    });
    expect(post).not.toHaveBeenCalled();
  });

  test('fetches and caches verified public keys and reports lookup failures', async () => {
    const api = createApi();
    const get = jest.spyOn(api, 'get');
    get.mockResolvedValueOnce({
      success: true,
      publicKey: recipientPublicKey,
    } as never);
    await expect(api.getPublicKey(recipientAddress)).resolves.toBe(
      recipientPublicKey,
    );
    await expect(api.getPublicKey(recipientAddress)).resolves.toBe(
      recipientPublicKey,
    );
    expect(get).toHaveBeenCalledTimes(1);

    get.mockResolvedValueOnce({
      success: false,
      errorMessage: 'missing',
    } as never);
    await expect(api.getPublicKey(otherRecipientAddress)).resolves.toBe('');
  });

  test('rejects mismatched and malformed node-supplied public keys without caching them', async () => {
    const api = createApi();
    const get = jest.spyOn(api, 'get');

    for (const invalidKey of [
      otherRecipientPublicKey,
      '',
      null,
      'not-a-public-key',
      '00'.repeat(31),
      offCurvePublicKey,
      nonCanonicalPublicKey,
    ]) {
      get.mockResolvedValueOnce({
        success: true,
        publicKey: invalidKey,
      } as never);

      await expect(api.getPublicKey(recipientAddress)).resolves.toBe('');
      expect(publicKeysCache.has(recipientAddress)).toBe(false);
    }

    // A subsequent valid response from a healthy node is accepted and cached.
    get.mockResolvedValueOnce({
      success: true,
      publicKey: recipientPublicKey,
    } as never);
    await expect(api.getPublicKey(recipientAddress)).resolves.toBe(
      recipientPublicKey,
    );
    expect(publicKeysCache.get(recipientAddress)).toBe(recipientPublicKey);
  });

  test('rejects invalid ADM addresses in getPublicKey without hitting the network', async () => {
    const api = createApi();
    const get = jest.spyOn(api, 'get');

    await expect(api.getPublicKey('invalid' as never)).resolves.toBe('');
    expect(get).not.toHaveBeenCalled();
  });

  test('verifies cached public keys on cache hit and evicts poisoned entries', async () => {
    const api = createApi();
    const get = jest.spyOn(api, 'get');

    // Poisoned cache with a valid Ed25519 key for a different account.
    publicKeysCache.set(recipientAddress, otherRecipientPublicKey);
    get.mockResolvedValueOnce({
      success: true,
      publicKey: recipientPublicKey,
    } as never);

    await expect(api.getPublicKey(recipientAddress)).resolves.toBe(
      recipientPublicKey,
    );
    expect(get).toHaveBeenCalledTimes(1);
    expect(publicKeysCache.get(recipientAddress)).toBe(recipientPublicKey);

    // Poisoned cache with a malformed key when the node also returns a mismatch.
    publicKeysCache.set(recipientAddress, offCurvePublicKey);
    get.mockResolvedValueOnce({
      success: true,
      publicKey: otherRecipientPublicKey,
    } as never);

    await expect(api.getPublicKey(recipientAddress)).resolves.toBe('');
    expect(get).toHaveBeenCalledTimes(2);
    expect(publicKeysCache.has(recipientAddress)).toBe(false);
  });

  test('encrypts and broadcasts address-based messages only when the recipient key matches the address', async () => {
    const api = createApi();
    const get = jest.spyOn(api, 'get').mockResolvedValueOnce({
      success: true,
      publicKey: recipientPublicKey,
    } as never);
    const post = jest
      .spyOn(api, 'post')
      .mockResolvedValue({success: true} as never);

    await expect(
      api.sendMessage(passphrase, recipientAddress, 'hello verified'),
    ).resolves.toMatchObject({success: true});
    expect(get).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledTimes(1);

    const [, payload] = post.mock.calls[0] as [
      string,
      {
        transaction: {
          recipientId: string;
          senderPublicKey: string;
          asset: {chat: {message: string; own_message: string}};
        };
      },
    ];
    expect(payload.transaction.recipientId).toBe(recipientAddress);
    expect(
      decodeMessage(
        payload.transaction.asset.chat.message,
        payload.transaction.senderPublicKey,
        recipientKeyPair,
        payload.transaction.asset.chat.own_message,
      ),
    ).toBe('hello verified');

    // Second send reuses the verified cached key without another lookup.
    await expect(
      api.sendMessage(passphrase, recipientAddress, 'hello cached'),
    ).resolves.toMatchObject({success: true});
    expect(get).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledTimes(2);
  });

  test('fails clearly without encrypting or broadcasting when the node supplies a mismatched or malformed recipient key', async () => {
    const logger = createLogger();
    const api = new AdamantApi({
      nodes: ['https://node.example'],
      checkHealthAtStartup: false,
      maxRetries: 0,
      logger,
    });
    const get = jest.spyOn(api, 'get');
    const post = jest
      .spyOn(api, 'post')
      .mockResolvedValue({success: true} as never);
    const expectedLookupError = `Unable to get a verified public key for ${recipientAddress}. It is necessary for sending an encrypted message. Account may be uninitialized (https://medium.com/adamant-im/chats-and-uninitialized-accounts-in-adamant-5035438e2fcd), a network error occurred, or the node-supplied key failed local verification`;

    get.mockResolvedValueOnce({
      success: true,
      publicKey: otherRecipientPublicKey,
    } as never);
    await expect(
      api.sendMessage(passphrase, recipientAddress, 'top secret'),
    ).resolves.toEqual({
      success: false,
      errorMessage: expectedLookupError,
    });
    expect(logger.warn).toHaveBeenLastCalledWith(
      expect.stringContaining(
        'public key does not derive the target ADM address',
      ),
    );

    get.mockResolvedValueOnce({
      success: true,
      publicKey: offCurvePublicKey,
    } as never);
    await expect(
      api.sendMessage(passphrase, recipientAddress, 'top secret'),
    ).resolves.toEqual({
      success: false,
      errorMessage: expectedLookupError,
    });
    expect(logger.warn).toHaveBeenLastCalledWith(
      expect.stringContaining(
        'public key is malformed or not a valid 32-byte Ed25519 public key',
      ),
    );

    get.mockResolvedValueOnce({
      success: false,
      errorMessage: 'Account not found',
    } as never);
    await expect(
      api.sendMessage(passphrase, recipientAddress, 'top secret'),
    ).resolves.toEqual({
      success: false,
      errorMessage: expectedLookupError,
    });

    expect(publicKeysCache.has(recipientAddress)).toBe(false);
    expect(post).not.toHaveBeenCalled();
  });

  test('rejects poisoned cache hits and overridden or prototype-spied getPublicKey mismatches before sendMessage encrypts', async () => {
    const api = createApi();
    const post = jest
      .spyOn(api, 'post')
      .mockResolvedValue({success: true} as never);

    // Poisoned cache + node mismatch must not fall back to the cached key.
    publicKeysCache.set(recipientAddress, otherRecipientPublicKey);
    jest.spyOn(api, 'get').mockResolvedValueOnce({
      success: true,
      publicKey: otherRecipientPublicKey,
    } as never);

    await expect(
      api.sendMessage(passphrase, recipientAddress, 'secret'),
    ).resolves.toEqual({
      success: false,
      errorMessage: expect.stringContaining('failed local verification'),
    });
    expect(publicKeysCache.has(recipientAddress)).toBe(false);

    // Prototype spies on getPublicKey must be honoured by sendMessage.
    const prototypeSpy = jest
      .spyOn(AdamantApi.prototype, 'getPublicKey')
      .mockResolvedValueOnce(otherRecipientPublicKey)
      .mockResolvedValueOnce(nonCanonicalPublicKey);

    try {
      await expect(
        api.sendMessage(passphrase, recipientAddress, 'secret'),
      ).resolves.toEqual({
        success: false,
        errorMessage: `Unable to verify recipient public key for ${recipientAddress}. The public key does not derive the target ADM address.`,
      });
      await expect(
        api.sendMessage(passphrase, recipientAddress, 'secret'),
      ).resolves.toEqual({
        success: false,
        errorMessage: `Unable to verify recipient public key for ${recipientAddress}. The public key is malformed or not a valid 32-byte Ed25519 public key.`,
      });
      expect(prototypeSpy).toHaveBeenCalledTimes(2);
    } finally {
      prototypeSpy.mockRestore();
    }

    expect(post).not.toHaveBeenCalled();
  });

  test('preserves direct full public key support in sendMessage while rejecting malformed or small-order 64-hex keys', async () => {
    const api = createApi();
    const get = jest.spyOn(api, 'get');
    const post = jest
      .spyOn(api, 'post')
      .mockResolvedValue({success: true} as never);

    await expect(
      api.sendMessage(passphrase, recipientPublicKey, 'direct key message'),
    ).resolves.toMatchObject({success: true});
    expect(get).not.toHaveBeenCalled();
    expect(post).toHaveBeenCalledTimes(1);

    const [, payload] = post.mock.calls[0] as [
      string,
      {
        transaction: {
          recipientId: string;
          senderPublicKey: string;
          asset: {chat: {message: string; own_message: string}};
        };
      },
    ];
    expect(payload.transaction.recipientId).toBe(recipientAddress);
    expect(
      decodeMessage(
        payload.transaction.asset.chat.message,
        payload.transaction.senderPublicKey,
        recipientKeyPair,
        payload.transaction.asset.chat.own_message,
      ),
    ).toBe('direct key message');

    await expect(
      api.sendMessage(passphrase, offCurvePublicKey, 'should fail'),
    ).resolves.toMatchObject({success: false});
    await expect(
      api.sendMessage(passphrase, nonCanonicalPublicKey, 'should fail'),
    ).resolves.toMatchObject({success: false});
    await expect(
      api.sendMessage(passphrase, smallOrderPublicKey, 'should fail'),
    ).resolves.toMatchObject({success: false});
    expect(post).toHaveBeenCalledTimes(1);
  });

  test('resolves address votes through the delegate list and validates cache writers and hits', async () => {
    const api = createApi();
    const {byAddress, byUsername} = (
      api as unknown as {delegateCaches: DelegateCaches}
    ).delegateCaches;
    const getDelegates = jest.spyOn(api, 'getDelegates');
    const getDelegate = jest.spyOn(api, 'getDelegate');
    const post = jest
      .spyOn(api, 'post')
      .mockResolvedValue({success: true} as never);

    // Messaging / caching a non-delegate address must not let voteForDelegate skip delegate membership checks.
    publicKeysCache.set(otherRecipientAddress, otherRecipientPublicKey);
    getDelegates.mockResolvedValueOnce({
      success: true,
      delegates: [{address: recipientAddress, publicKey: recipientPublicKey}],
    } as never);
    await expect(
      api.voteForDelegate(passphrase, [`+${otherRecipientAddress}`]),
    ).resolves.toMatchObject({
      success: false,
      errorMessage: expect.stringContaining('the address is not a delegate'),
    });
    expect(byAddress.has(otherRecipientAddress)).toBe(false);
    expect(post).not.toHaveBeenCalled();

    // Mismatched key from delegate list must be rejected and must not poison either address cache.
    getDelegates.mockResolvedValueOnce({
      success: true,
      delegates: [
        {address: recipientAddress, publicKey: otherRecipientPublicKey},
      ],
    } as never);
    await expect(
      api.voteForDelegate(passphrase, [`+${recipientAddress}`]),
    ).resolves.toMatchObject({
      success: false,
      errorMessage: expect.stringContaining(
        'public key does not derive the target ADM address',
      ),
    });
    expect(publicKeysCache.has(recipientAddress)).toBe(false);
    expect(byAddress.has(recipientAddress)).toBe(false);
    expect(post).not.toHaveBeenCalled();

    // Poisoned cache hit in the client's delegate-address cache must be evicted and re-fetched.
    byAddress.set(recipientAddress, otherRecipientPublicKey);
    getDelegates.mockResolvedValueOnce({
      success: true,
      delegates: [{address: recipientAddress, publicKey: recipientPublicKey}],
    } as never);
    await expect(
      api.voteForDelegate(passphrase, [`+${recipientAddress}`]),
    ).resolves.toMatchObject({success: true});
    expect(byAddress.get(recipientAddress)).toBe(recipientPublicKey);
    expect(publicKeysCache.get(recipientAddress)).toBe(recipientPublicKey);
    expect(post).toHaveBeenCalledWith(
      'accounts/delegates',
      expect.objectContaining({type: 3}),
    );

    // Subsequent vote for the same delegate address hits the client's delegate-address cache.
    await expect(
      api.voteForDelegate(passphrase, [`-${recipientAddress}`]),
    ).resolves.toMatchObject({success: true});
    expect(getDelegates).toHaveBeenCalledTimes(3);

    // Direction must still be checked even when the delegate address is cached.
    await expect(
      api.voteForDelegate(passphrase, [`x${recipientAddress}`]),
    ).resolves.toMatchObject({
      success: false,
      errorMessage: expect.stringContaining('the vote should have direction'),
    });

    // Delegate-name lookups require a valid address and self-consistent key binding.
    getDelegate.mockResolvedValueOnce({
      success: true,
      delegate: {
        username: 'bad_delegate',
        address: recipientAddress,
        publicKey: otherRecipientPublicKey,
      },
    } as never);
    await expect(
      api.voteForDelegate(passphrase, ['+bad_delegate']),
    ).resolves.toMatchObject({
      success: false,
      errorMessage: expect.stringContaining(
        'public key does not derive the target ADM address',
      ),
    });
    expect(byUsername.has('bad_delegate')).toBe(false);

    // Missing required DelegateDto.address must be rejected as malformed rather than downgrading to an unbound check.
    getDelegate.mockResolvedValueOnce({
      success: true,
      delegate: {
        username: 'no_addr_delegate',
        publicKey: otherRecipientPublicKey,
      },
    } as never);
    await expect(
      api.voteForDelegate(passphrase, ['+no_addr_delegate']),
    ).resolves.toMatchObject({
      success: false,
      errorMessage: expect.stringContaining(
        'public key is malformed or not a valid 32-byte Ed25519 public key',
      ),
    });
    expect(byUsername.has('no_addr_delegate')).toBe(false);

    getDelegate.mockResolvedValueOnce({
      success: true,
      delegate: {
        username: 'good_delegate',
        address: otherRecipientAddress,
        publicKey: otherRecipientPublicKey,
      },
    } as never);
    await expect(
      api.voteForDelegate(passphrase, ['+good_delegate']),
    ).resolves.toMatchObject({success: true});
    expect(byUsername.get('good_delegate')).toBe(otherRecipientPublicKey);
    expect(publicKeysCache.has('good_delegate')).toBe(false);

    // Subsequent delegate-name vote uses the verified cached key without another lookup.
    await expect(
      api.voteForDelegate(passphrase, ['+good_delegate']),
    ).resolves.toMatchObject({success: true});
    expect(getDelegate).toHaveBeenCalledTimes(3);

    // Poisoned delegate-name cache entry is evicted and re-fetched.
    byUsername.set('good_delegate', offCurvePublicKey);
    getDelegate.mockResolvedValueOnce({
      success: true,
      delegate: {
        username: 'good_delegate',
        address: otherRecipientAddress,
        publicKey: otherRecipientPublicKey,
      },
    } as never);
    await expect(
      api.voteForDelegate(passphrase, ['+good_delegate']),
    ).resolves.toMatchObject({success: true});
    expect(getDelegate).toHaveBeenCalledTimes(4);
    expect(byUsername.get('good_delegate')).toBe(otherRecipientPublicKey);
  });

  test('isolates delegate address and username caches per AdamantApi instance', async () => {
    const mainnetApi = createApi();
    const testnetApi = createApi();

    jest.spyOn(mainnetApi, 'getDelegates').mockResolvedValueOnce({
      success: true,
      delegates: [{address: recipientAddress, publicKey: recipientPublicKey}],
    } as never);
    jest.spyOn(mainnetApi, 'getDelegate').mockResolvedValueOnce({
      success: true,
      delegate: {
        username: 'shared_name',
        address: recipientAddress,
        publicKey: recipientPublicKey,
      },
    } as never);
    jest.spyOn(mainnetApi, 'post').mockResolvedValue({success: true} as never);

    await expect(
      mainnetApi.voteForDelegate(passphrase, [
        `+${recipientAddress}`,
        '+shared_name',
      ]),
    ).resolves.toMatchObject({success: true});

    // A second client (e.g. testnet) must not inherit mainnet delegate membership or username mappings.
    const testnetGetDelegates = jest
      .spyOn(testnetApi, 'getDelegates')
      .mockResolvedValueOnce({
        success: true,
        delegates: [],
      } as never);
    const testnetGetDelegate = jest
      .spyOn(testnetApi, 'getDelegate')
      .mockResolvedValueOnce({
        success: true,
        delegate: {
          username: 'shared_name',
          address: otherRecipientAddress,
          publicKey: otherRecipientPublicKey,
        },
      } as never);
    const testnetPost = jest
      .spyOn(testnetApi, 'post')
      .mockResolvedValue({success: true} as never);

    await expect(
      testnetApi.voteForDelegate(passphrase, [`+${recipientAddress}`]),
    ).resolves.toMatchObject({
      success: false,
      errorMessage: expect.stringContaining('the address is not a delegate'),
    });
    expect(testnetGetDelegates).toHaveBeenCalledTimes(1);

    await expect(
      testnetApi.voteForDelegate(passphrase, ['+shared_name']),
    ).resolves.toMatchObject({success: true});
    expect(testnetGetDelegate).toHaveBeenCalledTimes(1);
    expect(testnetPost).toHaveBeenCalledWith(
      'accounts/delegates',
      expect.objectContaining({
        asset: {votes: [`+${otherRecipientPublicKey}`]},
      }),
    );
  });
});

describe('AdamantApi query methods', () => {
  test('forwards every query method to the documented endpoint', async () => {
    const api = createApi();
    const get = jest
      .spyOn(api, 'get')
      .mockResolvedValue({success: true} as never);
    const post = jest
      .spyOn(api, 'post')
      .mockResolvedValue({success: true} as never);
    const calls: Array<() => Promise<unknown>> = [
      () => api.getAccountInfo({address: 'U123456'}),
      () => api.getAccountBalance('U123456'),
      () => api.getTopAccounts({limit: 2, offset: 1, isDelegate: 0}),
      () => api.createAccount(recipientPublicKey),
      () => api.getBlock('block'),
      () =>
        api.getBlocks({
          limit: 1,
          orderBy: 'height:desc',
          numberOfTransactions: 0,
          previousBlock: '1',
          totalAmount: 0,
          totalFee: 0,
          reward: 10000000,
        }),
      () => api.getChats('U123456', {type: 0}),
      () => api.getChatMessages('U123456', 'U654321', {and: {limit: 1}}),
      () => api.getChatTransactions({returnUnconfirmed: 1}),
      () => api.getDelegates({limit: 1, orderBy: 'rate:asc'}),
      () => api.getDelegate({username: 'delegate'}),
      () => api.searchDelegates('del', {limit: 1, orderBy: 'username:asc'}),
      () => api.getDelegatesCount(),
      () => api.getDelegateStats(recipientPublicKey, {start: 1, end: 2}),
      () => api.getNextForgers(10),
      () => api.getVoters(recipientPublicKey),
      () => api.getVoteData('U123456'),
      () =>
        api.getPeers({
          limit: 10,
          os: 'linux',
          state: 2,
          orderBy: 'ip:asc',
          version: '0.10.2',
          broadhash: 'abcdef',
          height: 1,
          port: 36666,
        }),
      () => api.getPeer('192.0.2.1', 36666),
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
      () => api.getKVS({key: 'profile', returnUnconfirmed: 1}),
      () => api.setKVS({transaction: {} as never}),
      () => api.getTransactions({or: {senderId: 'U123456'}}),
      () => api.sendTransaction({transaction: {} as never}),
      () => api.getTransaction('transaction', {and: {returnAsset: 1}}),
      () => api.getTransactionsCount(),
      () => api.getQueuedTransactions({senderPublicKey: recipientPublicKey}),
      () => api.getQueuedTransaction('transaction'),
      () => api.getUnconfirmedTransactions({address: 'U123456'}),
      () => api.getUnconfirmedTransaction('transaction'),
    ];
    await Promise.all(calls.map(call => call()));

    expect(get.mock.calls.map(([endpoint]) => endpoint)).toEqual([
      'accounts',
      'accounts/getBalance',
      'accounts/top',
      'blocks/get',
      'blocks',
      'chatrooms/U123456',
      'chatrooms/U123456/U654321',
      'chats/get',
      'delegates',
      'delegates/get',
      'delegates/search',
      'delegates/count',
      'delegates/forging/getForgedByAccount',
      'delegates/getNextForgers',
      'delegates/voters',
      'accounts/delegates',
      'peers',
      'peers/get',
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
      'states/get',
      'transactions',
      'transactions/get',
      'transactions/count',
      'transactions/queued',
      'transactions/queued/get',
      'transactions/unconfirmed',
      'transactions/unconfirmed/get',
    ]);
    expect(post.mock.calls.map(([endpoint]) => endpoint)).toEqual([
      'accounts/new',
      'states/store',
      'transactions',
    ]);
    expect(get).toHaveBeenCalledWith('delegates', {
      limit: 1,
      orderBy: 'rate:asc',
    });
    expect(get).toHaveBeenCalledWith('delegates/search', {
      q: 'del',
      limit: 1,
      orderBy: 'username:asc',
    });
    expect(get).toHaveBeenCalledWith('delegates/forging/getForgedByAccount', {
      generatorPublicKey: recipientPublicKey,
      start: 1,
      end: 2,
    });
    expect(get).toHaveBeenCalledWith('delegates/getNextForgers', {limit: 10});
    expect(get).toHaveBeenCalledWith('peers', {
      limit: 10,
      os: 'linux',
      state: 2,
      orderBy: 'ip:asc',
      version: '0.10.2',
      broadhash: 'abcdef',
      height: 1,
      port: 36666,
    });
    expect(get).toHaveBeenCalledWith('transactions/queued', {
      senderPublicKey: recipientPublicKey,
    });
    expect(get).toHaveBeenCalledWith('transactions/unconfirmed', {
      address: 'U123456',
    });
  });

  test('warns when the deprecated direct-transfer filter is used', async () => {
    const logger = createLogger();
    const api = new AdamantApi({
      nodes: ['https://node.example'],
      checkHealthAtStartup: false,
      logger,
    });
    jest.spyOn(api, 'get').mockResolvedValue({success: true} as never);

    await api.getChats('U123456', {withoutDirectTransfers: true});

    expect(logger.warn).toHaveBeenCalledWith(
      '[ADAMANT js-api] `withoutDirectTransfers` is deprecated. Use `includeDirectTransfers` instead.',
    );
  });

  test('warns for the deprecated direct-transfer filter nested under and/or', async () => {
    const logger = createLogger();
    const api = new AdamantApi({
      nodes: ['https://node.example'],
      checkHealthAtStartup: false,
      logger,
    });
    const get = jest
      .spyOn(api, 'get')
      .mockResolvedValue({success: true} as never);

    await api.getChatMessages('U123456', 'U654321', {
      and: {withoutDirectTransfers: 1},
    });
    await expect(
      api.getChatTransactions({or: {withoutDirectTransfers: 0}}),
    ).resolves.toEqual(
      unsupportedOrQueryResult({or: {withoutDirectTransfers: 0}}, 'chats'),
    );

    expect(get).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenLastCalledWith(
      '[ADAMANT js-api] `withoutDirectTransfers` is deprecated. Use `includeDirectTransfers` instead.',
    );
  });

  test('passes includeDirectTransfers through without a deprecation warning', async () => {
    const logger = createLogger();
    const api = new AdamantApi({
      nodes: ['https://node.example'],
      checkHealthAtStartup: false,
      logger,
    });
    const get = jest
      .spyOn(api, 'get')
      .mockResolvedValue({success: true} as never);

    await api.getChats('U123456', {includeDirectTransfers: true});

    expect(get).toHaveBeenLastCalledWith('chatrooms/U123456', {
      includeDirectTransfers: true,
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test('forwards multi-type and unconfirmed transaction filters', async () => {
    const api = createApi();
    const get = jest
      .spyOn(api, 'get')
      .mockResolvedValue({success: true} as never);

    await api.getTransactions({
      types: [0, 8],
      returnUnconfirmed: 1,
      and: {type: 8},
    });

    expect(get).toHaveBeenLastCalledWith('transactions', {
      'and:types': [0, 8],
      returnUnconfirmed: 1,
      'and:type': 8,
    });
  });

  test('combines top-level transaction filters with `and` by default', async () => {
    const api = createApi();
    const get = jest
      .spyOn(api, 'get')
      .mockResolvedValue({success: true} as never);

    await api.getTransactions({
      type: 0,
      recipientId: 'U123456',
      limit: 20,
      orderBy: 'timestamp:desc',
    });

    expect(get).toHaveBeenLastCalledWith('transactions', {
      'and:type': 0,
      'and:recipientId': 'U123456',
      limit: 20,
      orderBy: 'timestamp:desc',
    });
  });

  test('strips chat-only controls from transaction requests at runtime', async () => {
    const logger = createLogger();
    const api = new AdamantApi({
      nodes: ['https://node.example'],
      checkHealthAtStartup: false,
      logger,
    });
    const get = jest
      .spyOn(api, 'get')
      .mockResolvedValue({success: true} as never);

    await api.getTransactions({
      type: 0,
      includeDirectTransfers: true,
      withoutDirectTransfers: false,
      userId: 'U123456',
    } as never);

    expect(get).toHaveBeenLastCalledWith('transactions', {
      'and:type': 0,
    });
    expect(logger.warn.mock.calls).toEqual([
      [
        '[ADAMANT js-api] Query control `includeDirectTransfers` is not supported by the transactions endpoint and was ignored.',
      ],
      [
        '[ADAMANT js-api] Query control `withoutDirectTransfers` is not supported by the transactions endpoint and was ignored.',
      ],
      [
        '[ADAMANT js-api] Query control `userId` is not supported by the transactions endpoint and was ignored.',
      ],
    ]);

    await api.getTransactions({includeDirectTransfers: false} as never);
    expect(logger.warn).toHaveBeenCalledTimes(3);
  });

  test('warns once when flat AND and OR conditions are mixed', async () => {
    const logger = createLogger();
    const api = new AdamantApi({
      nodes: ['https://node.example'],
      checkHealthAtStartup: false,
      logger,
    });
    jest.spyOn(api, 'get').mockResolvedValue({success: true} as never);

    await api.getTransactions({
      type: 8,
      or: {senderId: 'U111', recipientId: 'U222'},
    });
    await api.getTransactions({
      and: {type: 0},
      or: {recipientId: 'U333'},
    });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenLastCalledWith(
      '[ADAMANT js-api] Query mixes `and` and `or` conditions. ADAMANT Node flattens them in wire order without parentheses, so JavaScript object key order changes the result.',
    );
  });
});

describe('transaction query serialization across endpoints', () => {
  const spyGet = (api: AdamantApi) =>
    jest.spyOn(api, 'get').mockResolvedValue({success: true} as never);

  describe('/api/transactions (getTransactions)', () => {
    test('and-combines a rich filter mix and passes options through', async () => {
      const api = createApi();
      const get = spyGet(api);

      await api.getTransactions({
        senderId: 'U111',
        recipientId: 'U222',
        type: 0,
        minAmount: 1000,
        maxAmount: 5000,
        fromHeight: 100,
        fromUnixTime: 1464109200,
        toUnixTime: 1464109300,
        limit: 25,
        offset: 50,
        orderBy: 'timestamp:desc',
        returnAsset: 1,
        returnUnconfirmed: 1,
      });

      expect(get).toHaveBeenLastCalledWith('transactions', {
        'and:senderId': 'U111',
        'and:recipientId': 'U222',
        'and:type': 0,
        'and:minAmount': 1000,
        'and:maxAmount': 5000,
        'and:fromHeight': 100,
        'and:fromUnixTime': 1464109200,
        'and:toUnixTime': 1464109300,
        limit: 25,
        offset: 50,
        orderBy: 'timestamp:desc',
        returnAsset: 1,
        returnUnconfirmed: 1,
      });
    });

    test('supports an explicit `or` group mixed with default-and filters', async () => {
      const api = createApi();
      const get = spyGet(api);

      await api.getTransactions({
        type: 8,
        or: {senderId: 'U111', recipientId: 'U222'},
        limit: 10,
      });

      expect(get).toHaveBeenLastCalledWith('transactions', {
        'and:type': 8,
        'or:senderId': 'U111',
        'or:recipientId': 'U222',
        limit: 10,
      });
    });

    test('getTransaction forwards the id alongside and-combined filters', async () => {
      const api = createApi();
      const get = spyGet(api);

      await api.getTransaction('T123', {returnAsset: 1, and: {type: 0}});

      expect(get).toHaveBeenLastCalledWith('transactions/get', {
        id: 'T123',
        returnAsset: 1,
        'and:type': 0,
      });
    });
  });

  describe('/api/chats/get (getChatTransactions)', () => {
    test('sends plain filter names and flattens an explicit and wrapper', async () => {
      const api = createApi();
      const get = spyGet(api);

      await api.getChatTransactions({
        senderId: 'U111',
        type: 8,
        fromHeight: 100,
        toHeight: 200,
        limit: 20,
        orderBy: 'timestamp:desc',
        and: {recipientId: 'U222'},
      });

      expect(get).toHaveBeenLastCalledWith('chats/get', {
        senderId: 'U111',
        type: 8,
        fromHeight: 100,
        toHeight: 200,
        recipientId: 'U222',
        limit: 20,
        orderBy: 'timestamp:desc',
      });
    });

    test('rejects amount filters at the type level (the node ignores them here)', async () => {
      const api = createApi();
      const get = spyGet(api);

      await api.getChatTransactions({
        type: 8,
        // @ts-expect-error `/api/chats/get` does not support amount filters
        minAmount: 1000,
      });

      // Narrowing filters are intentionally forwarded rather than silently
      // stripped: ADAMANT Node v0.11.0+ rejects unsupported filters instead of
      // returning silently broadened results, while TypeScript catches them at
      // compile time.
      expect(get).toHaveBeenLastCalledWith('chats/get', {
        type: 8,
        minAmount: 1000,
      });
    });
  });

  describe('/api/chatrooms (getChats, getChatMessages)', () => {
    test('getChats sends plain `type` and passes chatroom options through', async () => {
      const api = createApi();
      const get = spyGet(api);

      await api.getChats('U123456', {
        type: 8,
        includeDirectTransfers: true,
        limit: 15,
        offset: 30,
        orderBy: 'timestamp:desc',
      });

      expect(get).toHaveBeenLastCalledWith('chatrooms/U123456', {
        type: 8,
        includeDirectTransfers: true,
        limit: 15,
        offset: 30,
        orderBy: 'timestamp:desc',
      });
    });

    test('getChatMessages sends plain filters and strips deprecated `userId` with a warning', async () => {
      const logger = createLogger();
      const api = new AdamantApi({
        nodes: ['https://node.example'],
        checkHealthAtStartup: false,
        logger,
      });
      const get = spyGet(api);

      await api.getChatMessages('U123', 'U456', {
        type: 8,
        userId: 'U123',
        limit: 5,
        and: {senderId: 'U123'},
      });

      expect(get).toHaveBeenLastCalledWith('chatrooms/U123/U456', {
        type: 8,
        senderId: 'U123',
        limit: 5,
      });
      expect(logger.warn).toHaveBeenCalledWith(
        '[ADAMANT js-api] `userId` is deprecated: ADAMANT Node v0.11.0+ rejects it on /api/chatrooms/*; the address is taken from the URL path and this parameter was ignored.',
      );
    });

    test('rejects unsupported filters at the type level on chatrooms', async () => {
      const api = createApi();
      const get = spyGet(api);

      await api.getChats('U123456', {
        type: 8,
        // @ts-expect-error `/api/chatrooms` does not support amount filters
        maxAmount: 5000,
      });

      expect(get).toHaveBeenLastCalledWith('chatrooms/U123456', {
        type: 8,
        maxAmount: 5000,
      });

      await api.getChats('U123456', {
        type: 8,
        // @ts-expect-error `/api/chatrooms` does not support height filters in v0.11.0
        fromHeight: 100,
      });

      expect(get).toHaveBeenLastCalledWith('chatrooms/U123456', {
        type: 8,
        fromHeight: 100,
      });
    });
  });

  describe('/api/states/get (getKVS)', () => {
    test('sends plain KVS filters and passes options through', async () => {
      const api = createApi();
      const get = spyGet(api);

      await api.getKVS({
        key: 'eth:address',
        keyIds: ['eth:address', 'doge:address'],
        senderId: 'U111',
        senderIds: ['U111', 'U222'],
        fromHeight: 100,
        toHeight: 500,
        limit: 10,
        orderBy: 'timestamp:desc',
        and: {type: 9},
      });

      expect(get).toHaveBeenLastCalledWith('states/get', {
        key: 'eth:address',
        keyIds: ['eth:address', 'doge:address'],
        senderId: 'U111',
        senderIds: ['U111', 'U222'],
        fromHeight: 100,
        toHeight: 500,
        type: 9,
        limit: 10,
        orderBy: 'timestamp:desc',
      });
    });

    test('supports POST /api/states/get for large KVS queries with idempotent failover', async () => {
      const api = new AdamantApi({
        nodes: ['https://node1.example', 'https://node2.example'],
        checkHealthAtStartup: false,
        maxRetries: 2,
        logger: createLogger(),
      });
      jest.spyOn(api, 'updateNodes').mockImplementation(async () => {
        api.node = 'https://node2.example';
      });
      request
        .mockRejectedValueOnce(
          new AxiosError('too many requests', undefined, undefined, undefined, {
            status: 429,
            headers: {'retry-after': '15', 'ratelimit-scope': 'read'},
            data: {
              success: false,
              error: 'Too many requests, please try again later.',
            },
          } as never),
        )
        .mockRejectedValueOnce(
          new AxiosError('unavailable', undefined, undefined, undefined, {
            status: 503,
          } as never),
        )
        .mockResolvedValueOnce({
          data: {
            success: true,
            transactions: [],
            count: 0,
          },
        });

      const result = await api.getKVS(
        {
          keyIds: ['eth:address', 'btc:address'],
          senderIds: ['U111', 'U222'],
          toHeight: 500,
          limit: 50,
        },
        {method: 'POST'},
      );

      expect(result).toEqual({success: true, transactions: [], count: 0});
      expect(request).toHaveBeenLastCalledWith({
        method: 'POST',
        url: 'https://node2.example/api/states/get',
        data: {
          keyIds: ['eth:address', 'btc:address'],
          senderIds: ['U111', 'U222'],
          toHeight: 500,
          limit: 50,
        },
      });
    });

    test('rejects amount filters at the type level (states/get filters by key, not amount)', async () => {
      const api = createApi();
      const get = spyGet(api);

      await api.getKVS({
        key: 'eth:address',
        // @ts-expect-error `/api/states/get` does not support amount filters
        minAmount: 1000,
      });

      expect(get).toHaveBeenLastCalledWith('states/get', {
        key: 'eth:address',
        minAmount: 1000,
      });
    });

    test('sends the recorded plain KVS query and returns that node body', async () => {
      const api = createApi();
      // Recorded 2026-11-14 from endless.adamant.im for
      // /api/states/get?senderId=U16655734187932477074&key=eth:address&orderBy=timestamp:desc
      // The same filters with an `and:` prefix are ignored by released nodes.
      request.mockResolvedValue({data: statesGetPlainFilters});

      const response = await api.getKVS({
        senderId: 'U16655734187932477074',
        key: 'eth:address',
        orderBy: 'timestamp:desc',
      });

      expect(request).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://node.example/api/states/get',
        params: {
          senderId: 'U16655734187932477074',
          key: 'eth:address',
          orderBy: 'timestamp:desc',
        },
      });
      expect(response).toEqual(statesGetPlainFilters);
      if (!response.success) {
        throw new Error(response.errorMessage);
      }
      expect(response.count).toBe(1);
      expect(response.transactions[0]?.senderId).toBe('U16655734187932477074');
      expect(response.transactions[0]?.asset.state.key).toBe('eth:address');
    });
  });
});

describe('or filters on and-only endpoints', () => {
  const cases: Array<{
    name: string;
    endpoint: 'chatrooms' | 'chats' | 'states';
    query: {or: Record<string, unknown>};
    call: (api: AdamantApi) => Promise<unknown>;
  }> = [
    {
      name: 'getKVS',
      endpoint: 'states',
      query: {or: {senderId: 'U111'}},
      call: api => api.getKVS({key: 'eth:address', or: {senderId: 'U111'}}),
    },
    {
      name: 'getChats',
      endpoint: 'chatrooms',
      query: {or: {type: 0}},
      call: api => api.getChats('U123456', {or: {type: 0}}),
    },
    {
      name: 'getChatMessages',
      endpoint: 'chatrooms',
      query: {or: {type: 8}},
      call: api => api.getChatMessages('U123456', 'U654321', {or: {type: 8}}),
    },
    {
      name: 'getChatTransactions',
      endpoint: 'chats',
      query: {or: {senderId: 'U111'}},
      call: api => api.getChatTransactions({or: {senderId: 'U111'}}),
    },
    {
      name: 'empty or wrapper',
      endpoint: 'states',
      query: {or: {}},
      call: api => api.getKVS({or: {}}),
    },
    {
      name: 'top-level prefixed filter on getKVS',
      endpoint: 'states',
      query: {'and:senderId': 'U111', key: 'eth:address'} as never,
      call: api =>
        api.getKVS({
          'and:senderId': 'U111',
          key: 'eth:address',
        } as never),
    },
    {
      name: 'prefixed filter inside and wrapper on getChatTransactions',
      endpoint: 'chats',
      query: {and: {'or:senderId': 'U111'}} as never,
      call: api =>
        api.getChatTransactions({and: {'or:senderId': 'U111'}} as never),
    },
    {
      name: 'prefixed filter on getChats',
      endpoint: 'chatrooms',
      query: {'or:type': 8} as never,
      call: api => api.getChats('U123456', {'or:type': 8} as never),
    },
  ];

  test.each(cases)(
    'rejects an or wrapper from $name without calling the node',
    async ({endpoint, query, call}) => {
      const logger = createLogger();
      const api = new AdamantApi({
        nodes: ['https://node.example'],
        checkHealthAtStartup: false,
        logger,
      });
      const get = jest
        .spyOn(api, 'get')
        .mockResolvedValue({success: true} as never);

      await expect(call(api)).resolves.toEqual(
        unsupportedOrQueryResult(query, endpoint),
      );
      expect(get).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    },
  );
});
