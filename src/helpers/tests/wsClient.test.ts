import {io} from 'socket.io-client';
import type {AnyTransaction} from '../../api/generated';
import {TransactionType} from '../constants';
import type {ActiveNode} from '../healthCheck';
import {Logger} from '../logger';
import {WebSocketClient} from '../wsClient';

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
  ({type, recipientId}) as unknown as AnyTransaction;

describe('WebSocketClient', () => {
  const output = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
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
    expect(io).toHaveBeenCalledTimes(1);
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

  test('warns instead of connecting when no node supports sockets', () => {
    const client = new WebSocketClient({admAddress: 'U123456', logger});
    client.reviseConnection([node({socketSupport: false})]);
    expect(io).not.toHaveBeenCalled();
    expect(output.warn).toHaveBeenCalledWith(
      '[Socket] No supported socket nodes at the moment.',
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

    expect(all).toHaveBeenCalledTimes(5);
    expect(send).toHaveBeenCalledTimes(2);
    expect(delegate).toHaveBeenCalledTimes(1);
    expect(vote).toHaveBeenCalledTimes(1);
    expect(message).toHaveBeenCalledTimes(1);
    expect(kvs).toHaveBeenCalledTimes(1);

    client.off(send).off(all);
    socket.listeners.newTrans(transaction(TransactionType.SEND));
    await new Promise(resolve => setImmediate(resolve));
    expect(send).toHaveBeenCalledTimes(2);
    expect(all).toHaveBeenCalledTimes(5);
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
    expect(output.error).toHaveBeenCalledWith('Error: handler failed');
  });
});
