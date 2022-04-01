const time = require('../time');
const {epochTime} = require('../constants');

describe('getTime', () => {
  test('Should return 0 for epoch time', () => {
    expect(
        time.getTime(epochTime.getTime()),
    ).toBe(0);
  });
});
