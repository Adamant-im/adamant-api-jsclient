/**
 * Internal helpers for reading HTTP rate-limit headers (`Retry-After`,
 * `RateLimit-Reset`, `RateLimit-Scope`) from Axios responses.
 */
export const getResponseHeader = (
  headers: unknown,
  name: string,
): string | undefined => {
  if (!headers || typeof headers !== 'object') {
    return undefined;
  }

  const target = name.toLowerCase();
  const getter = (headers as {get?: (key: string) => unknown}).get;
  if (typeof getter === 'function') {
    const value = getter.call(headers, target);
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }

  for (const [key, value] of Object.entries(
    headers as Record<string, unknown>,
  )) {
    if (key.toLowerCase() !== target) {
      continue;
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (
      Array.isArray(value) &&
      typeof value[0] === 'string' &&
      value[0].trim()
    ) {
      return value[0].trim();
    }
  }

  return undefined;
};

const parseDeltaSecondsMs = (value: string | undefined): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (/^\d+(?:\.\d+)?$/.test(value)) {
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.ceil(seconds * 1000);
    }
  }

  return undefined;
};

export const parseRetryAfterMs = (headers: unknown): number | undefined => {
  const retryAfter = getResponseHeader(headers, 'retry-after');
  const retryAfterSecondsMs = parseDeltaSecondsMs(retryAfter);
  if (retryAfterSecondsMs !== undefined) {
    return retryAfterSecondsMs;
  }

  if (retryAfter) {
    const timestamp = Date.parse(retryAfter);
    if (!Number.isNaN(timestamp)) {
      return Math.max(0, timestamp - Date.now());
    }
  }

  return parseDeltaSecondsMs(getResponseHeader(headers, 'ratelimit-reset'));
};
