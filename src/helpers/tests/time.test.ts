import {getEpochTime, getEpochTimeMs, EPOCH_TIME} from '../time';

describe('getTime', () => {
  test('should return 0 for epoch time', () => {
    expect(getEpochTime(EPOCH_TIME.getTime())).toBe(0);
  });
});

describe('getEpochTimeMs', () => {
  test('should return 0 for epoch time', () => {
    expect(getEpochTimeMs(EPOCH_TIME.getTime())).toBe(0);
  });

  test('should keep millisecond precision and match getEpochTime by second', () => {
    const unix = EPOCH_TIME.getTime() + 109234800123;

    expect(getEpochTimeMs(unix)).toBe(109234800123);
    expect(Math.floor(getEpochTimeMs(unix) / 1000)).toBe(getEpochTime(unix));
  });
});
