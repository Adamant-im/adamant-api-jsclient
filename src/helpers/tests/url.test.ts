import dns from 'dns/promises';
import {parseUrl, retrieveIP} from '../url';

jest.mock('dns/promises', () => ({
  __esModule: true,
  default: {resolve4: jest.fn()},
}));

const resolve4 = jest.mocked(dns.resolve4);

describe('URL helpers', () => {
  beforeEach(() => resolve4.mockReset());

  test('parses HTTPS hostnames and resolves their IPv4 address', async () => {
    resolve4.mockResolvedValue(['192.0.2.10']);
    await expect(parseUrl('https://node.example:443')).resolves.toEqual({
      baseURL: 'node.example',
      ip: '192.0.2.10',
      isHttps: true,
    });
  });

  test('does not resolve literal IPv4 addresses', async () => {
    await expect(parseUrl('http://127.0.0.1:36666')).resolves.toEqual({
      baseURL: '127.0.0.1',
      ip: '127.0.0.1',
      isHttps: false,
    });
    expect(resolve4).not.toHaveBeenCalled();
  });

  test('returns undefined for unusable or failed DNS answers', async () => {
    resolve4.mockResolvedValueOnce(['0.0.0.0']).mockResolvedValueOnce([]);
    await expect(retrieveIP('blocked.example')).resolves.toBeUndefined();
    await expect(retrieveIP('empty.example')).resolves.toBeUndefined();

    resolve4.mockRejectedValue(new Error('DNS unavailable'));
    await expect(retrieveIP('offline.example')).resolves.toBeUndefined();
  });
});
