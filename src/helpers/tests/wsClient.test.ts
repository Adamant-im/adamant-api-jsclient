import {io} from 'socket.io-client';
import type {AnyTransaction} from '../../api/generated';
import {MessageType, TransactionType} from '../constants';
import type {ActiveNode} from '../healthCheck';
import {Logger} from '../logger';
import {AdamantWsConnectionError, WebSocketClient} from '../wsClient';

jest.mock('socket.io-client', () => ({io: jest.fn()}));

type Listener = (...args: any[]) => void;

const makeSocket = () => {
  const listeners: Record<string, Listener> = {};
  return {
    connected: false,
    emit: jest.fn(),
    on: jest.fn((event: string, listener: Listener) => {
      listeners[event] = listener;
      return socket;
    }),
    disconnect: jest.fn(),
    removeAllListeners: jest.fn(),
    listeners,
  };
  function socket() {}
};

const node = (overrides: Partial<ActiveNode> = {}): ActiveNode => ({
  node: 'https://node.example',
  ping: 10,
  baseURL: 'node.example',
  ip: '192.0.2.1',
  isHttps: true,
  height: 100,
  heightEpsilon: 20,
  socketSupport: true,
  wsPort: 36667,
  ...overrides,
});

const transaction = (type: TransactionType, recipientId = 'U123456') =>
  ({
    type,
    recipientId,
    senderId: 'U654321',
    asset: type === TransactionType.CHAT_MESSAGE ? {chat: {type: 1}} : {},
  }) as unknown as AnyTransaction;

describe('WebSocketClient', () => {
  const output = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
  };
  const logger = new Logger('log', output);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('filters nodes, connects, subscribes and reports socket lifecycle events', () => {
    const socket = makeSocket();
    jest.mocked(io).mockReturnValue(socket as never);
    const client = new WebSocketClient({
      admAddress: 'U123456',
      useFastest: true,
      logger,
    });

    client.reviseConnection([
      node(),
      node({node: 'no-socket', socketSupport: false}),
      node({node: 'stale', outOfSync: true}),
      node({node: 'no-ip', ip: undefined}),
    ]);

    expect(io).toHaveBeenCalledWith('ws://192.0.2.1:36667', {
      reconnection: false,
      timeout: 5000,
    });
    socket.listeners.connect();
    expect(socket.emit).toHaveBeenCalledWith('address', 'U123456');
    socket.listeners.disconnect('transport close');
    socket.listeners.connect_error(new Error('offline'));
    expect(output.info).toHaveBeenCalled();
    expect(output.warn).toHaveBeenCalledTimes(2);

    socket.connected = true;
    client.reviseConnection([node({ip: '192.0.2.2'})]);
    expect(io).toHaveBeenCalledTimes(2);
    client.disconnect();
  });

  test('supports wss and random node selection', () => {
    const socket = makeSocket();
    jest.mocked(io).mockReturnValue(socket as never);
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const client = new WebSocketClient({
      admAddress: 'U123456',
      wsType: 'wss',
      logger,
    });
    client.reviseConnection([
      node(),
      node({baseURL: 'second.example', ip: undefined}),
    ]);

    expect(client.fastestNode().baseURL).toBe('node.example');
    expect(client.randomNode().baseURL).toBe('second.example');
    expect(io).toHaveBeenCalledWith('wss://second.example', expect.any(Object));
  });

  test('refreshes the healthy-node list without replacing a live socket', () => {
    jest.useFakeTimers();
    const first = makeSocket();
    const second = makeSocket();
    jest
      .mocked(io)
      .mockReturnValueOnce(first as never)
      .mockReturnValueOnce(second as never);
    const client = new WebSocketClient({
      admAddress: 'U123456',
      reconnectionDelay: 100,
      logger,
    });

    client.reviseConnection([node()]);
    first.connected = true;
    client.reviseConnection([node({ip: '192.0.2.2'})]);
    expect(io).toHaveBeenCalledTimes(1);

    first.connected = false;
    first.listeners.disconnect('transport close');
    jest.advanceTimersByTime(100);
    expect(io).toHaveBeenLastCalledWith('ws://192.0.2.2:36667', {
      reconnection: false,
      timeout: 5000,
    });

    client.disconnect();
    jest.useRealTimers();
  });

  test('warns instead of connecting when no node supports sockets', () => {
    const client = new WebSocketClient({admAddress: 'U123456', logger});
    client.reviseConnection([node({socketSupport: false})]);
    expect(io).not.toHaveBeenCalled();
    expect(output.warn).toHaveBeenCalledWith(
      '[ADAMANT js-api Socket] No supported socket nodes at the moment.',
    );
  });

  test('dispatches every supported transaction type and removes handlers', async () => {
    const socket = makeSocket();
    jest.mocked(io).mockReturnValue(socket as never);
    const client = new WebSocketClient({admAddress: 'U123456', logger});
    const all = jest.fn();
    const send = jest.fn();
    const delegate = jest.fn();
    const vote = jest.fn();
    const message = jest.fn();
    const kvs = jest.fn();

    client
      .on(all)
      .on([TransactionType.SEND], send)
      .onTransfer(send)
      .onNewDelegate(delegate)
      .onVoteForDelegate(vote)
      .onMessage(message)
      .onKVS(kvs);
    client.reviseConnection([node()]);

    for (const type of [
      TransactionType.SEND,
      TransactionType.DELEGATE,
      TransactionType.VOTE,
      TransactionType.CHAT_MESSAGE,
      TransactionType.STATE,
    ]) {
      socket.listeners.newTrans(transaction(type));
    }
    socket.listeners.newTrans(transaction(TransactionType.SEND, 'U999999'));
    await new Promise(resolve => setImmediate(resolve));

    expect(all).toHaveBeenCalledTimes(6);
    expect(send).toHaveBeenCalledTimes(4);
    expect(delegate).toHaveBeenCalledTimes(1);
    expect(vote).toHaveBeenCalledTimes(1);
    expect(message).toHaveBeenCalledTimes(1);
    expect(kvs).toHaveBeenCalledTimes(1);

    client.off(send).off(all);
    socket.listeners.newTrans(transaction(TransactionType.SEND));
    await new Promise(resolve => setImmediate(resolve));
    expect(send).toHaveBeenCalledTimes(4);
    expect(all).toHaveBeenCalledTimes(6);
  });

  test('subscribes to multiple addresses, transaction types and message types', () => {
    const socket = makeSocket();
    jest.mocked(io).mockReturnValue(socket as never);
    const client = new WebSocketClient({
      admAddress: 'U123456',
      admAddresses: ['U654321', 'U123456'],
      types: [TransactionType.SEND, TransactionType.CHAT_MESSAGE],
      assetChatTypes: [MessageType.Chat, MessageType.Rich],
      logger,
    });

    client.reviseConnection([node()]);
    socket.listeners.connect();

    expect(socket.emit).toHaveBeenCalledWith('address', ['U123456', 'U654321']);
    expect(socket.emit).toHaveBeenCalledWith('types', [
      TransactionType.SEND,
      TransactionType.CHAT_MESSAGE,
    ]);
    expect(socket.emit).toHaveBeenCalledWith('assetChatTypes', [
      MessageType.Chat,
      MessageType.Rich,
    ]);
  });

  test('dispatches chat asset types through convenience handlers', async () => {
    const socket = makeSocket();
    jest.mocked(io).mockReturnValue(socket as never);
    const chat = jest.fn();
    const rich = jest.fn();
    const signal = jest.fn();
    const client = new WebSocketClient({admAddress: 'U123456', logger});
    client
      .onChatMessage(chat)
      .onRichMessage(rich)
      .onSignalMessage(signal)
      .reviseConnection([node()]);
    socket.listeners.connect();

    for (const messageType of [
      MessageType.Chat,
      MessageType.Rich,
      MessageType.Signal,
    ]) {
      const message = transaction(TransactionType.CHAT_MESSAGE) as any;
      message.asset.chat.type = messageType;
      socket.listeners.newTrans(message);
    }
    await new Promise(resolve => setImmediate(resolve));

    expect(chat).toHaveBeenCalledTimes(1);
    expect(rich).toHaveBeenCalledTimes(1);
    expect(signal).toHaveBeenCalledTimes(1);
    expect(socket.emit).toHaveBeenCalledWith('assetChatTypes', [1, 2, 3]);
  });

  test.each([
    ['allDirections', 'U654321', 'U999999', true],
    ['incoming', 'U654321', 'U123456', true],
    ['incoming', 'U123456', 'U654321', false],
    ['outgoing', 'U123456', 'U654321', true],
    ['outgoing', 'U654321', 'U123456', false],
    ['self', 'U123456', 'U123456', true],
    ['self', 'U654321', 'U123456', false],
  ] as const)(
    'filters %s transactions by subscribed address',
    async (direction, senderId, recipientId, expected) => {
      const socket = makeSocket();
      jest.mocked(io).mockReturnValue(socket as never);
      const handler = jest.fn();
      const client = new WebSocketClient({
        admAddress: 'U123456',
        direction,
        logger,
      }).on(handler);
      client.reviseConnection([node()]);

      socket.listeners.newTrans({
        ...transaction(TransactionType.SEND, recipientId),
        id: `${direction}-transaction`,
        senderId,
      });
      await new Promise(resolve => setImmediate(resolve));

      expect(handler).toHaveBeenCalledTimes(expected ? 1 : 0);
    },
  );

  test('treats transfers between subscribed addresses as both directions', async () => {
    const socket = makeSocket();
    jest.mocked(io).mockReturnValue(socket as never);
    const handler = jest.fn();
    const client = new WebSocketClient({
      admAddresses: ['U123456', 'U654321'],
      direction: 'incoming',
      logger,
    }).on(handler);
    client.reviseConnection([node()]);

    socket.listeners.newTrans({
      ...transaction(TransactionType.SEND, 'U654321'),
      senderId: 'U123456',
    });
    await new Promise(resolve => setImmediate(resolve));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('logs received transaction direction at debug level', async () => {
    const socket = makeSocket();
    jest.mocked(io).mockReturnValue(socket as never);
    const debugLogger = new Logger('debug', output);
    const client = new WebSocketClient({
      admAddress: 'U123456',
      direction: 'incoming',
      logger: debugLogger,
    }).on(jest.fn());
    client.reviseConnection([node()]);

    socket.listeners.newTrans({
      ...transaction(TransactionType.SEND),
      id: '123',
      amount: 100000000,
    });
    await new Promise(resolve => setImmediate(resolve));

    expect(output.debug).toHaveBeenCalledWith(
      '[ADAMANT js-api Socket] Processing transaction 123: U654321 -> U123456; type: 0 (SEND); amount: 100000000; direction: incoming; filter: incoming.',
    );
  });

  test('marks transactions rejected by the direction filter as discarded', async () => {
    const socket = makeSocket();
    jest.mocked(io).mockReturnValue(socket as never);
    const debugLogger = new Logger('debug', output);
    const handler = jest.fn();
    const client = new WebSocketClient({
      admAddress: 'U123456',
      direction: 'outgoing',
      logger: debugLogger,
    }).on(handler);
    client.reviseConnection([node()]);

    socket.listeners.newTrans({
      ...transaction(TransactionType.SEND),
      id: '456',
      amount: 50000000,
    });
    await new Promise(resolve => setImmediate(resolve));

    expect(output.debug).toHaveBeenCalledWith(
      '[ADAMANT js-api Socket] Discarding transaction 456: U654321 -> U123456; type: 0 (SEND); amount: 50000000; direction: incoming; filter: outgoing.',
    );
    expect(handler).not.toHaveBeenCalled();
  });

  test('reports malformed chat transactions without an unhandled rejection', async () => {
    const socket = makeSocket();
    jest.mocked(io).mockReturnValue(socket as never);
    const caught = jest.fn();
    const client = new WebSocketClient({
      admAddress: 'U123456',
      logger,
    })
      .onMessage(jest.fn())
      .catch(caught);
    client.reviseConnection([node()]);

    socket.listeners.newTrans({
      ...transaction(TransactionType.CHAT_MESSAGE),
      asset: {},
    });
    await new Promise(resolve => setImmediate(resolve));

    expect(caught).toHaveBeenCalledWith(
      new TypeError(
        'Received a malformed chat transaction without asset.chat.type',
      ),
    );
  });

  test('reconnects with lifecycle callbacks and supports manual disconnect', () => {
    jest.useFakeTimers();
    const first = makeSocket();
    const second = makeSocket();
    jest
      .mocked(io)
      .mockReturnValueOnce(first as never)
      .mockReturnValueOnce(second as never);
    const connected = jest.fn();
    const reconnected = jest.fn();
    const client = new WebSocketClient({
      admAddress: 'U123456',
      reconnectionDelay: 100,
      logger,
    })
      .onConnection(connected)
      .onReconnection(reconnected);

    client.reviseConnection([node()]);
    first.listeners.connect();
    first.listeners.disconnect('transport close');
    jest.advanceTimersByTime(100);
    second.listeners.connect();

    expect(connected).toHaveBeenCalledTimes(1);
    expect(reconnected).toHaveBeenCalledTimes(1);
    client.disconnect();
    expect(second.removeAllListeners).toHaveBeenCalled();
    expect(second.disconnect).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('uses default reconnection logging and reports exhausted attempts', () => {
    jest.useFakeTimers();
    const first = makeSocket();
    const second = makeSocket();
    jest
      .mocked(io)
      .mockReturnValueOnce(first as never)
      .mockReturnValueOnce(second as never);
    const client = new WebSocketClient({
      admAddress: 'U123456',
      reconnectionDelay: 100,
      logger,
    });
    client.reviseConnection([node()]);
    first.listeners.connect();
    first.listeners.disconnect('transport close');
    jest.advanceTimersByTime(100);
    second.listeners.connect();
    expect(output.info).toHaveBeenCalledWith(
      '[ADAMANT js-api Socket] Reconnected to ws://192.0.2.1:36667',
    );
    client.disconnect();

    const failed = makeSocket();
    jest.mocked(io).mockReturnValueOnce(failed as never);
    const caught = jest.fn();
    const exhausted = new WebSocketClient({
      admAddress: 'U123456',
      maxTries: 0,
      logger,
    }).catch(caught);
    exhausted.reviseConnection([node()]);
    failed.listeners.connect_error(new Error('offline'));
    expect(caught).toHaveBeenCalledWith(
      expect.objectContaining<Partial<AdamantWsConnectionError>>({
        name: 'AdamantWsConnectionError',
        reason: 'connection_error',
        details: 'Error: offline',
      }),
    );
    exhausted.disconnect();
    jest.useRealTimers();
  });

  test('cancels a pending reconnect when a new connection is established', () => {
    jest.useFakeTimers();
    const first = makeSocket();
    const second = makeSocket();
    jest
      .mocked(io)
      .mockReturnValueOnce(first as never)
      .mockReturnValueOnce(second as never);
    const client = new WebSocketClient({
      admAddress: 'U123456',
      reconnectionDelay: 100,
      logger,
    });

    client.reviseConnection([node()]);
    first.listeners.connect();
    // A dropped connection schedules a reconnect timer.
    first.listeners.disconnect('transport close');
    // A health-check refresh reconnects before that timer fires.
    client.reviseConnection([node()]);
    jest.advanceTimersByTime(200);

    // The pending timer was cancelled, so no third socket is created.
    expect(io).toHaveBeenCalledTimes(2);
    client.disconnect();
    jest.useRealTimers();
  });

  test('releases the dead socket when reconnection attempts are exhausted', () => {
    const failed = makeSocket();
    jest.mocked(io).mockReturnValueOnce(failed as never);
    const caught = jest.fn();
    const client = new WebSocketClient({
      admAddress: 'U123456',
      maxTries: 0,
      logger,
    }).catch(caught);

    client.reviseConnection([node()]);
    failed.listeners.connect_error(new Error('offline'));

    expect(caught).toHaveBeenCalledTimes(1);
    expect(failed.removeAllListeners).toHaveBeenCalled();
    expect(failed.disconnect).toHaveBeenCalled();
  });

  test('resets the retry budget for a fresh connection cycle', () => {
    jest.useFakeTimers();
    const first = makeSocket();
    const retry = makeSocket();
    const fresh = makeSocket();
    const freshRetry = makeSocket();
    jest
      .mocked(io)
      .mockReturnValueOnce(first as never)
      .mockReturnValueOnce(retry as never)
      .mockReturnValueOnce(fresh as never)
      .mockReturnValueOnce(freshRetry as never);
    const caught = jest.fn();
    const client = new WebSocketClient({
      admAddress: 'U123456',
      maxTries: 1,
      reconnectionDelay: 100,
      logger,
    }).catch(caught);

    client.reviseConnection([node()]);
    first.listeners.connect_error(new Error('first failure'));
    jest.advanceTimersByTime(100);
    retry.listeners.connect_error(new Error('retry failure'));
    expect(caught).toHaveBeenCalledTimes(1);

    client.reviseConnection([node()]);
    fresh.listeners.connect_error(new Error('fresh failure'));
    expect(caught).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(100);
    expect(io).toHaveBeenCalledTimes(4);

    client.disconnect();
    jest.useRealTimers();
  });

  test('routes synchronous and asynchronous handler errors to catch()', async () => {
    const socket = makeSocket();
    jest.mocked(io).mockReturnValue(socket as never);
    const caught = jest.fn();
    const client = new WebSocketClient({admAddress: 'U123456', logger});
    client
      .onTransfer(() => {
        throw new Error('sync');
      })
      .onTransfer(async () => Promise.reject(new Error('async')))
      .catch(caught);
    client.reviseConnection([node()]);
    socket.listeners.newTrans(transaction(TransactionType.SEND));
    await new Promise(resolve => setImmediate(resolve));
    expect(caught).toHaveBeenCalledTimes(2);
  });

  test('logs handler failures when no custom error callback is installed', async () => {
    const socket = makeSocket();
    jest.mocked(io).mockReturnValue(socket as never);
    const client = new WebSocketClient({admAddress: 'U123456', logger});
    client.onTransfer(() => {
      throw new Error('handler failed');
    });
    client.reviseConnection([node()]);
    socket.listeners.newTrans(transaction(TransactionType.SEND));
    await new Promise(resolve => setImmediate(resolve));
    expect(output.error).toHaveBeenCalledWith(
      '[ADAMANT js-api Socket] Error: handler failed',
    );
  });
});
