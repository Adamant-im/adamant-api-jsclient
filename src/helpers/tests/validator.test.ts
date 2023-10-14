import * as validator from '../validator';

describe('isNumeric', () => {
  test('should return false for a number', () => {
    expect(validator.isNumeric(3)).toBe(false);
  });

  test('should return false for Infinity', () => {
    expect(validator.isNumeric(Infinity)).toBe(false);
  });

  test('should return false for an object', () => {
    expect(validator.isNumeric({})).toBe(false);
  });

  test('should return false for undefined', () => {
    expect(validator.isNumeric(undefined)).toBe(false);
  });

  test('should return false for NaN', () => {
    expect(validator.isNumeric(NaN)).toBe(false);
  });

  test('should return false for `n3.14`', () => {
    expect(validator.isNumeric('n3.14')).toBe(false);
  });

  test('should return true for `3,14`', () => {
    expect(validator.isNumeric('3,14')).toBe(true);
  });

  test('should return true for `3.14`', () => {
    expect(validator.isNumeric('3.14')).toBe(true);
  });

  test('should return true for ` 3.14`', () => {
    expect(validator.isNumeric(' 3.14')).toBe(true);
  });
});

describe('isPassPhrase', () => {
  test('should return false for a number', () => {
    expect(validator.isPassPhrase(3)).toBe(false);
  });

  test('should return false for an object', () => {
    expect(validator.isPassPhrase({})).toBe(false);
  });

  test('should return false for undefined', () => {
    expect(validator.isPassPhrase(undefined)).toBe(false);
  });

  test('should return false for NaN', () => {
    expect(validator.isPassPhrase(NaN)).toBe(false);
  });

  test('should return false for a too short string', () => {
    expect(validator.isPassPhrase('short')).toBe(false);
  });

  test('should return true for a 12 word string', () => {
    expect(validator.isPassPhrase('word '.repeat(12))).toBe(true);
  });
});

describe('isAdmAddress', () => {
  test('should return false for a number', () => {
    expect(validator.isAdmAddress(3)).toBe(false);
  });

  test('should return false for an object', () => {
    expect(validator.isAdmAddress({})).toBe(false);
  });

  test('should return false for undefined', () => {
    expect(validator.isAdmAddress(undefined)).toBe(false);
  });

  test('should return false for NaN', () => {
    expect(validator.isAdmAddress(NaN)).toBe(false);
  });

  test('should return false for U123', () => {
    expect(validator.isAdmAddress('U123')).toBe(false);
  });

  test('should return false for ` U123456`', () => {
    expect(validator.isAdmAddress(' U123456')).toBe(false);
  });

  test('should return false for `U123213N123`', () => {
    expect(validator.isAdmAddress('U123213N123')).toBe(false);
  });

  test('should return true for U123456', () => {
    expect(validator.isAdmAddress('U1234506')).toBe(true);
  });

  test('should return true for U01234561293812931283918239', () => {
    expect(validator.isAdmAddress('U01234561293812931283918239')).toBe(true);
  });
});

describe('isAdmPublicKey', () => {
  test('should return false for a number', () => {
    expect(validator.isAdmPublicKey(3)).toBe(false);
  });

  test('should return false for an object', () => {
    expect(validator.isAdmPublicKey({})).toBe(false);
  });

  test('should return false for undefined', () => {
    expect(validator.isAdmPublicKey(undefined)).toBe(false);
  });

  test('should return false for NaN', () => {
    expect(validator.isAdmPublicKey(NaN)).toBe(false);
  });

  test('should return false for a short string', () => {
    expect(validator.isAdmPublicKey('0f')).toBe(false);
  });

  test('should return false for a string that contains `L`', () => {
    expect(
      validator.isAdmPublicKey(
        'Le003f782cd1c1c84a6767a871321af2ecdb3da8d8f6b8d1f13179835b6ec432'
      )
    ).toBe(false);
  });

  test('should return true for a public key that starts with a number', () => {
    expect(
      validator.isAdmPublicKey(
        '4e003f782cd1c1c84A6767a871321af2ecdb3da8d8f6b8d1f13179835b6ec432'
      )
    ).toBe(true);
  });

  test('should return true for a public key that starts with a letter', () => {
    expect(
      validator.isAdmPublicKey(
        'e4003f782cd1c1c84A6767a871321af2ecdb3da8d8f6b8d1f13179835b6ec432'
      )
    ).toBe(true);
  });
});

describe('isAdmVoteForAddress', () => {
  test('should return false for a number', () => {
    expect(validator.isAdmVoteForAddress(3)).toBe(false);
  });

  test('should return false for an object', () => {
    expect(validator.isAdmVoteForAddress({})).toBe(false);
  });

  test('should return false for undefined', () => {
    expect(validator.isAdmVoteForAddress(undefined)).toBe(false);
  });

  test('should return false for NaN', () => {
    expect(validator.isAdmVoteForAddress(NaN)).toBe(false);
  });

  test('should return false for a short string', () => {
    expect(validator.isAdmVoteForAddress('0f')).toBe(false);
  });

  test('should return false for a string that starts with `L`', () => {
    expect(validator.isAdmVoteForAddress('L01234561293812931283918239')).toBe(
      false
    );
  });

  test('should return false for an address that starts with a number', () => {
    expect(validator.isAdmVoteForAddress('0U1234561293812931283918239')).toBe(
      false
    );
  });

  test('should return false for an address that starts with a letter', () => {
    expect(validator.isAdmVoteForAddress('U01234561293812931283918239')).toBe(
      false
    );
  });

  test('should return true for an address with a plus', () => {
    expect(validator.isAdmVoteForAddress('+U01234561293812931283918239')).toBe(
      true
    );
  });

  test('should return true for an address with a minus', () => {
    expect(validator.isAdmVoteForAddress('+U01234561293812931283918239')).toBe(
      true
    );
  });
});

describe('isAdmVoteForPublicKey', () => {
  test('should return false for a number', () => {
    expect(validator.isAdmVoteForPublicKey(3)).toBe(false);
  });

  test('should return false for an object', () => {
    expect(validator.isAdmVoteForPublicKey({})).toBe(false);
  });

  test('should return false for undefined', () => {
    expect(validator.isAdmVoteForPublicKey(undefined)).toBe(false);
  });

  test('should return false for NaN', () => {
    expect(validator.isAdmVoteForPublicKey(NaN)).toBe(false);
  });

  test('should return false for a short string', () => {
    expect(validator.isAdmVoteForPublicKey('0f')).toBe(false);
  });

  test('should return false for a string that starts with `L`', () => {
    expect(
      validator.isAdmVoteForPublicKey(
        '+L4e003f782cd1c1c84A6767a871321af2ecdb3da8d8f6b8d1f13179835b6ec432'
      )
    ).toBe(false);
  });

  test('should return false for a public key that starts with a number', () => {
    expect(
      validator.isAdmVoteForPublicKey(
        '4e003f782cd1c1c84A6767a871321af2ecdb3da8d8f6b8d1f13179835b6ec432'
      )
    ).toBe(false);
  });

  test('should return false for a public key that starts with a letter', () => {
    expect(
      validator.isAdmVoteForPublicKey(
        'e4003f782cd1c1c84A6767a871321af2ecdb3da8d8f6b8d1f13179835b6ec432'
      )
    ).toBe(false);
  });

  test('should return true for a public key with a plus', () => {
    expect(
      validator.isAdmVoteForPublicKey(
        '+4e003f782cd1c1c84A6767a871321af2ecdb3da8d8f6b8d1f13179835b6ec432'
      )
    ).toBe(true);
  });

  test('should return true for a public key with a minus', () => {
    expect(
      validator.isAdmVoteForPublicKey(
        '+4e003f782cd1c1c84A6767a871321af2ecdb3da8d8f6b8d1f13179835b6ec432'
      )
    ).toBe(true);
  });
});

describe('isAdmVoteForDelegateName', () => {
  test('should return false for a number', () => {
    expect(validator.isAdmVoteForDelegateName(3)).toBe(false);
  });

  test('should return false for an object', () => {
    expect(validator.isAdmVoteForDelegateName({})).toBe(false);
  });

  test('should return false for undefined', () => {
    expect(validator.isAdmVoteForDelegateName(undefined)).toBe(false);
  });

  test('should return false for NaN', () => {
    expect(validator.isAdmVoteForDelegateName(NaN)).toBe(false);
  });

  test('should return false for a short string', () => {
    expect(validator.isAdmVoteForDelegateName('0f')).toBe(false);
  });

  test('should return false for a vote without delegate name', () => {
    expect(validator.isAdmVoteForDelegateName('+')).toBe(false);
  });

  test('should return false for a too long delegate name', () => {
    expect(
      validator.isAdmVoteForDelegateName('+e003f782cd1c1c84A6767a871321af2e')
    ).toBe(false);
  });

  test('should return false for a vote that starts with a number', () => {
    expect(validator.isAdmVoteForDelegateName('4darksinc')).toBe(false);
  });

  test('should return false for a vote that starts with a letter', () => {
    expect(validator.isAdmVoteForDelegateName('darksinc')).toBe(false);
  });

  test('should return true for a delegate name with a plus', () => {
    expect(validator.isAdmVoteForDelegateName('+darksinc')).toBe(true);
  });

  test('should return true for a delegate name with a minus', () => {
    expect(validator.isAdmVoteForDelegateName('+darksinc')).toBe(true);
  });
});

describe('validateMessage', () => {
  test('should return false for a number message', () => {
    expect(validator.validateMessage(3 as any).success).toBe(false);
  });

  test('should return false for an object message', () => {
    expect(validator.validateMessage({} as any).success).toBe(false);
  });

  test('should return true for an empty string message', () => {
    expect(validator.validateMessage('').success).toBe(true);
  });

  test('should return false for an empty string rich message', () => {
    expect(validator.validateMessage('', 2).success).toBe(false);
  });

  test('should return false for an empty string signal message', () => {
    expect(validator.validateMessage('', 3).success).toBe(false);
  });

  test('should return false for an empty json rich message', () => {
    expect(validator.validateMessage('{}', 2).success).toBe(false);
  });

  test('should return false for an empty json signal message', () => {
    expect(validator.validateMessage('{}', 3).success).toBe(false);
  });

  test('should return true for a json rich message with the given amount', () => {
    expect(validator.validateMessage('{"amount": "0.13"}', 2).success).toBe(
      true
    );
  });

  test('should return true for a json signal message with the given amount', () => {
    expect(validator.validateMessage('{"amount": "0.13"}', 3).success).toBe(
      true
    );
  });

  test('should return false for a json rich message with upercase coin name', () => {
    expect(
      validator.validateMessage(
        '{"amount": "0.13", "type": "ETH_transaction"}',
        2
      ).success
    ).toBe(false);
  });

  test('should return false for a json signal message with upercase coin name', () => {
    expect(
      validator.validateMessage(
        '{"amount": "0.13", "type": "ETH_transaction"}',
        3
      ).success
    ).toBe(false);
  });

  test('should return true for a json rich message with lowercase coin name', () => {
    expect(
      validator.validateMessage(
        '{"amount": "0.13", "type": "eth_transaction"}',
        2
      ).success
    ).toBe(true);
  });

  test('should return true for a json signal message with lowercase coin name', () => {
    expect(
      validator.validateMessage(
        '{"amount": "0.13", "type": "eth_transaction"}',
        3
      ).success
    ).toBe(true);
  });
});

describe('isDelegateName', () => {
  test('should return false for a number', () => {
    expect(validator.isDelegateName(1)).toBe(false);
  });

  test('should return true for valid name', () => {
    expect(validator.isDelegateName('validname')).toBe(true);
  });

  test('should return true for name with numbers', () => {
    expect(validator.isDelegateName('name_with1_number')).toBe(true);
  });

  test('should return true for name with special characters', () => {
    expect(validator.isDelegateName('allow&special!chars')).toBe(true);
  });

  test('should return true for short name (minimum length)', () => {
    expect(validator.isDelegateName('short')).toBe(true);
  });

  test('should return true for name with underscores', () => {
    expect(validator.isDelegateName('this_is_a_valid_name')).toBe(true);
  });

  test('should return false for an empty string', () => {
    expect(validator.isDelegateName('')).toBe(false);
  });

  test('should return false for camel case with spaces', () => {
    expect(validator.isDelegateName('CamelCase')).toBe(false);
  });

  test('should return false for long name (exceeds maximum length)', () => {
    expect(validator.isDelegateName('name-that-is-way-too-long')).toBe(false);
  });

  test('should return false for name with invalid characters', () => {
    expect(validator.isDelegateName('!invalid$%characters&')).toBe(false);
  });

  test('should return false for name with spaces', () => {
    expect(validator.isDelegateName('there is space')).toBe(false);
  });
});
