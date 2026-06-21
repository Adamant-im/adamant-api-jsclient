import axios from 'axios';
import {NodeManager, type ActiveNode} from '../healthCheck';
import {Logger} from '../logger';
import {WebSocketClient} from '../wsClient';

jest.mock('axios');

const activeNode = (name: string, height: number, ping = 10): ActiveNode => ({
  node: `https://${name}`,
  ping,
  baseURL: name,
  ip: '192.0.2.1',
  isHttps: true,
  height,
  heightEpsilon: Math.round(height / 5),
  socketSupport: true,
  wsPort: 36667,
  version: '0.9.0',
});

describe('NodeManager', () => {
  const output = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
  };
  const logger = new Logger('log', output);

  beforeEach(() => jest.clearAllMocks());

  test('becomes ready immediately when startup checks are disabled', () => {
    const manager = new NodeManager(logger, {
      nodes: ['https://one'],
      checkHealthAtStartup: false,
    });
    const ready = jest.fn();
    manager.onReady(ready);
    // A later refresh exercises the callback path in ready().
    jest
      .spyOn(manager, 'checkNodes')
      .mockResolvedValue([activeNode('one', 100)]);
    return manager.updateNodes().then(() => expect(ready).toHaveBeenCalled());
  });

  test('initializes an existing socket or creates one from options', () => {
    const manager = new NodeManager(logger, {
      nodes: ['https://one'],
      checkHealthAtStartup: false,
    });
    const socket = new WebSocketClient({admAddress: 'U123456', logger});
    manager.initSocket(socket);
    expect(manager.socket).toBe(socket);
    manager.initSocket({admAddress: 'U123456'});
    expect(manager.socket).toBeInstanceOf(WebSocketClient);
  });

  test('selects the only healthy node and reports when none are available', async () => {
    const manager = new NodeManager(logger, {
      nodes: ['https://one', 'https://two'],
      checkHealthAtStartup: false,
    });
    const reviseConnection = jest.fn();
    manager.socket = {reviseConnection} as unknown as WebSocketClient;
    await manager.chooseNode([activeNode('two', 100)]);
    expect(manager.node).toBe('https://two');
    expect(reviseConnection).toHaveBeenCalled();

    await manager.chooseNode([]);
    expect(output.error).toHaveBeenCalledWith(
      expect.stringContaining('All of 2 nodes are unavailable'),
    );
  });

  test('selects the higher of two nodes and marks the other out of sync', async () => {
    const manager = new NodeManager(logger, {
      nodes: ['https://one'],
      checkHealthAtStartup: false,
    });
    const lower = activeNode('lower', 100);
    const higher = activeNode('higher', 110);
    await manager.chooseNode([lower, higher]);
    expect(manager.node).toBe('https://higher');
    expect(lower.outOfSync).toBe(true);

    lower.heightEpsilon = 30;
    higher.heightEpsilon = 20;
    await manager.chooseNode([lower, higher]);
    expect(higher.outOfSync).toBe(true);
  });

  test('uses the fastest node in the majority height group and can force a change', async () => {
    const manager = new NodeManager(logger, {
      nodes: [
        'https://fast',
        'https://slow',
        'https://stale',
        'https://offline',
      ],
      checkHealthAtStartup: false,
    });
    const fast = activeNode('fast', 100, 1);
    const slow = activeNode('slow', 101, 20);
    const stale = activeNode('stale', 200, 2);
    await manager.chooseNode([slow, stale, fast]);
    expect(manager.node).toBe('https://fast');
    expect(stale.outOfSync).toBe(true);

    jest.spyOn(Math, 'random').mockReturnValue(0);
    await manager.chooseNode([fast, slow, stale], true);
    expect(manager.node).toBe('https://slow');
    expect(output.log).toHaveBeenCalledWith(
      expect.stringContaining("1 node didn't respond, 1 node is not synced"),
    );
    expect(output.log).toHaveBeenLastCalledWith(
      expect.stringContaining('Active node is https://slow (v0.9.0).'),
    );
  });

  test('excludes nodes below the minimum version', async () => {
    const manager = new NodeManager(logger, {
      nodes: ['https://old', 'https://current', 'https://offline'],
      minVersion: '0.9.0',
      checkHealthAtStartup: false,
    });
    const reviseConnection = jest.fn();
    manager.socket = {reviseConnection} as unknown as WebSocketClient;
    const old = activeNode('old', 100);
    old.version = '0.8.0';
    const current = activeNode('current', 100);
    current.version = 'v0.9.0';

    await manager.chooseNode([old, current]);

    expect(manager.node).toBe('https://current');
    expect(reviseConnection).toHaveBeenCalledWith([current]);
    expect(output.warn).toHaveBeenCalledWith(
      '[ADAMANT js-api] Health check: Node https://old version v0.8.0 is below minimum required version v0.9.0',
    );
    expect(output.log).toHaveBeenCalledWith(
      "[ADAMANT js-api] Health check: Found 1 supported and synced node, 1 node didn't respond, 1 node is below minimum version v0.9.0. Active node is https://current (v0.9.0).",
    );
  });

  test('reports when every responding node is below the minimum version', async () => {
    const manager = new NodeManager(logger, {
      nodes: ['https://old'],
      minVersion: '0.9.0',
      checkHealthAtStartup: false,
    });
    const old = activeNode('old', 100);
    old.version = '0.8.0';

    await manager.chooseNode([old]);

    expect(output.error).toHaveBeenCalledWith(
      '[ADAMANT js-api] Health check: No compatible nodes available. 1 node is below minimum required version v0.9.0.',
    );
  });

  test('checks nodes and retains parsed health and socket data', async () => {
    const manager = new NodeManager(logger, {
      nodes: ['http://127.0.0.1:36666', 'https://offline.example'],
      timeout: 123,
      checkHealthAtStartup: false,
    });
    jest
      .spyOn(manager, 'checkNode')
      .mockResolvedValueOnce({
        success: true,
        network: {height: 101},
        version: {version: '0.9.0'},
        wsClient: {enabled: true, port: 36667},
      } as never)
      .mockResolvedValueOnce({success: false} as never);

    const nodes = await manager.checkNodes();
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({
      node: 'http://127.0.0.1:36666',
      baseURL: '127.0.0.1',
      height: 101,
      heightEpsilon: 20,
      socketSupport: true,
      wsPort: 36667,
      version: '0.9.0',
    });
    expect(output.log).toHaveBeenCalledWith(
      expect.stringContaining("offline.example hasn't returned its status"),
    );
  });

  test('returns node status and converts request failures into unsuccessful results', async () => {
    const manager = new NodeManager(logger, {
      nodes: ['https://one'],
      timeout: 123,
      checkHealthAtStartup: false,
    });
    jest.mocked(axios.get).mockResolvedValueOnce({
      data: {success: true, network: {}, wsClient: {}},
    });
    await expect(manager.checkNode('https://one')).resolves.toMatchObject({
      success: true,
    });
    expect(axios.get).toHaveBeenCalledWith('https://one/api/node/status', {
      timeout: 123,
    });

    jest.mocked(axios.get).mockRejectedValueOnce(new Error('offline'));
    await expect(manager.checkNode('https://one')).resolves.toEqual({
      success: false,
    });
  });

  test('prevents overlapping refreshes', async () => {
    const manager = new NodeManager(logger, {
      nodes: ['https://one'],
      checkHealthAtStartup: false,
    });
    let release!: (nodes: ActiveNode[]) => void;
    jest
      .spyOn(manager, 'checkNodes')
      .mockImplementation(() => new Promise(resolve => (release = resolve)));
    const first = manager.updateNodes(true);
    const second = manager.updateNodes(true);
    expect(await second).toBeUndefined();
    release([activeNode('one', 100)]);
    await first;
    expect(manager.checkNodes).toHaveBeenCalledTimes(1);
  });

  test('runs startup and scheduled health checks', () => {
    jest.useFakeTimers();
    const update = jest
      .spyOn(NodeManager.prototype, 'updateNodes')
      .mockResolvedValue();
    new NodeManager(logger, {nodes: ['https://one']});
    expect(update).toHaveBeenCalledWith(true);
    jest.advanceTimersByTime(5 * 60 * 1000);
    expect(update).toHaveBeenCalledTimes(2);
    update.mockRestore();
    jest.useRealTimers();
  });
});
