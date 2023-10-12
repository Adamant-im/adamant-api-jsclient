import {getEpochTime, EPOCH_TIME} from '../time';

describe('getTime', () => {
  test('should return 0 for epoch time', () => {
    expect(getEpochTime(EPOCH_TIME.getTime())).toBe(0);
  });
});
