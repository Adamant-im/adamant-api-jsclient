export const EPOCH_TIME = new Date(Date.UTC(2017, 8, 2, 17, 0, 0, 0));

export const getEpochTime = (timestamp?: number) => {
  const startTimestamp = timestamp ?? Date.now();
  const epochTimestamp = EPOCH_TIME.getTime();

  return Math.floor((startTimestamp - epochTimestamp) / 1000);
};

/**
 * Returns the time since the ADAMANT epoch in milliseconds.
 *
 * Suitable for the optional `timestampMs` transaction field. The matching
 * second-precision `timestamp` must be derived from the same value with
 * `Math.floor(timestampMs / 1000)` so the two stay within the same second.
 */
export const getEpochTimeMs = (timestamp?: number) => {
  const startTimestamp = timestamp ?? Date.now();
  const epochTimestamp = EPOCH_TIME.getTime();

  return startTimestamp - epochTimestamp;
};

export const unixTimestamp = () => new Date().getTime();
