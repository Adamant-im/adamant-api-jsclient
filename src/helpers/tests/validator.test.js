const validator = require("../validator");

describe("isNumeric", () => {
  test("Should return false for a number", () => {
    expect(validator.isNumeric(3)).toBe(false);
  });

  test("Should return false for Infinity", () => {
    expect(validator.isNumeric(Infinity)).toBe(false);
  });

  test("Should return false for an object", () => {
    expect(validator.isNumeric({})).toBe(false);
  });

  test("Should return false for undefined", () => {
    expect(validator.isNumeric(undefined)).toBe(false);
  });

  test("Should return false for NaN", () => {
    expect(validator.isNumeric(undefined)).toBe(false);
  });

  test("Should return false for `n3.14`", () => {
    expect(validator.isNumeric("n3.14")).toBe(false);
  });

  test("Should return false for `3,14`", () => {
    expect(validator.isNumeric("3,14")).toBe(true);
  });

  test("Should return true for `3.14`", () => {
    expect(validator.isNumeric("3.14")).toBe(true);
  });

  test("Should return true for ` 3.14`", () => {
    expect(validator.isNumeric(" 3.14")).toBe(true);
  });
});

describe("validatePassPhrase", () => {
  test("Should return false for a number", () => {
    expect(validator.validatePassPhrase(3)).toBe(false);
  });

  test("Should return false for an object", () => {
    expect(validator.validatePassPhrase({})).toBe(false);
  });

  test("Should return false for undefined", () => {
    expect(validator.validatePassPhrase(undefined)).toBe(false);
  });

  test("Should return false for NaN", () => {
    expect(validator.validatePassPhrase(undefined)).toBe(false);
  });

  test("Should return false for a too short string", () => {
    expect(validator.validatePassPhrase("short")).toBe(false);
  });

  test("Should return true for a long string", () => {
    expect(validator.validatePassPhrase("word ".repeat(12))).toBe(true);
  });
});

describe("validateAdmAddress", () => {
  test("Should return false for a number", () => {
    expect(validator.validateAdmAddress(3)).toBe(false);
  });

  test("Should return false for an object", () => {
    expect(validator.validateAdmAddress({})).toBe(false);
  });

  test("Should return false for undefined", () => {
    expect(validator.validateAdmAddress(undefined)).toBe(false);
  });

  test("Should return false for NaN", () => {
    expect(validator.validateAdmAddress(undefined)).toBe(false);
  });

  test("Should return false for U123", () => {
    expect(validator.validateAdmAddress("U123")).toBe(false);
  });

  test("Should return false for ` U123456`", () => {
    expect(validator.validateAdmAddress(" U123456")).toBe(false);
  });

  test("Should return false for `U123213N123`", () => {
    expect(validator.validateAdmAddress("U123213N123")).toBe(false);
  });

  test("Should return true for U123456", () => {
    expect(validator.validateAdmAddress("U1234506")).toBe(true);
  });

  test("Should return true for U01234561293812931283918239", () => {
    expect(validator.validateAdmAddress("U01234561293812931283918239")).toBe(
      true,
    );
  });
});

describe("validateAdmPublicKey", () => {
  test("Should return false for a number", () => {
    expect(validator.validateAdmPublicKey(3)).toBe(false);
  });

  test("Should return false for an object", () => {
    expect(validator.validateAdmPublicKey({})).toBe(false);
  });

  test("Should return false for undefined", () => {
    expect(validator.validateAdmPublicKey(undefined)).toBe(false);
  });

  test("Should return false for NaN", () => {
    expect(validator.validateAdmPublicKey(undefined)).toBe(false);
  });

  test("Should return false for a short string", () => {
    expect(validator.validateAdmPublicKey("0f")).toBe(false);
  });

  test("Should return false for a string that contains `L`", () => {
    expect(
      validator.validateAdmPublicKey(
        "Le003f782cd1c1c84a6767a871321af2ecdb3da8d8f6b8d1f13179835b6ec432",
      ),
    ).toBe(false);
  });

  test("Should return true for a public key that starts with a number", () => {
    expect(
      validator.validateAdmPublicKey(
        "4e003f782cd1c1c84A6767a871321af2ecdb3da8d8f6b8d1f13179835b6ec432",
      ),
    ).toBe(true);
  });

  test("Should return true for a public key that starts with a letter", () => {
    expect(
      validator.validateAdmPublicKey(
        "e4003f782cd1c1c84A6767a871321af2ecdb3da8d8f6b8d1f13179835b6ec432",
      ),
    ).toBe(true);
  });
});

describe("validateAdmVoteForAddress", () => {
  test("Should return false for a number", () => {
    expect(validator.validateAdmVoteForAddress(3)).toBe(false);
  });

  test("Should return false for an object", () => {
    expect(validator.validateAdmVoteForAddress({})).toBe(false);
  });

  test("Should return false for undefined", () => {
    expect(validator.validateAdmVoteForAddress(undefined)).toBe(false);
  });

  test("Should return false for NaN", () => {
    expect(validator.validateAdmVoteForAddress(undefined)).toBe(false);
  });

  test("Should return false for a short string", () => {
    expect(validator.validateAdmVoteForAddress("0f")).toBe(false);
  });

  test("Should return false for a string that starts with `L`", () => {
    expect(
      validator.validateAdmVoteForAddress("L01234561293812931283918239"),
    ).toBe(false);
  });

  test("Should return false for an address that starts with a number", () => {
    expect(
      validator.validateAdmVoteForAddress("0U1234561293812931283918239"),
    ).toBe(false);
  });

  test("Should return false for an address that starts with a letter", () => {
    expect(
      validator.validateAdmVoteForAddress("U01234561293812931283918239"),
    ).toBe(false);
  });

  test("Should return true for an address with a plus", () => {
    expect(
      validator.validateAdmVoteForAddress("+U01234561293812931283918239"),
    ).toBe(true);
  });

  test("Should return true for an address with a minus", () => {
    expect(
      validator.validateAdmVoteForAddress("+U01234561293812931283918239"),
    ).toBe(true);
  });
});

describe("validateAdmVoteForPublicKey", () => {
  test("Should return false for a number", () => {
    expect(validator.validateAdmVoteForPublicKey(3)).toBe(false);
  });

  test("Should return false for an object", () => {
    expect(validator.validateAdmVoteForPublicKey({})).toBe(false);
  });

  test("Should return false for undefined", () => {
    expect(validator.validateAdmVoteForPublicKey(undefined)).toBe(false);
  });

  test("Should return false for NaN", () => {
    expect(validator.validateAdmVoteForPublicKey(undefined)).toBe(false);
  });

  test("Should return false for a short string", () => {
    expect(validator.validateAdmVoteForPublicKey("0f")).toBe(false);
  });

  test("Should return false for a string that starts with `L`", () => {
    expect(
      validator.validateAdmVoteForPublicKey(
        "+L4e003f782cd1c1c84A6767a871321af2ecdb3da8d8f6b8d1f13179835b6ec432",
      ),
    ).toBe(false);
  });

  test("Should return false for a public key that starts with a number", () => {
    expect(
      validator.validateAdmVoteForPublicKey(
        "4e003f782cd1c1c84A6767a871321af2ecdb3da8d8f6b8d1f13179835b6ec432",
      ),
    ).toBe(false);
  });

  test("Should return false for a public key that starts with a letter", () => {
    expect(
      validator.validateAdmVoteForPublicKey(
        "e4003f782cd1c1c84A6767a871321af2ecdb3da8d8f6b8d1f13179835b6ec432",
      ),
    ).toBe(false);
  });

  test("Should return true for a public key with a plus", () => {
    expect(
      validator.validateAdmVoteForPublicKey(
        "+4e003f782cd1c1c84A6767a871321af2ecdb3da8d8f6b8d1f13179835b6ec432",
      ),
    ).toBe(true);
  });

  test("Should return true for a public key with a minus", () => {
    expect(
      validator.validateAdmVoteForPublicKey(
        "+4e003f782cd1c1c84A6767a871321af2ecdb3da8d8f6b8d1f13179835b6ec432",
      ),
    ).toBe(true);
  });
});

describe("validateAdmVoteForDelegateName", () => {
  test("Should return false for a number", () => {
    expect(validator.validateAdmVoteForDelegateName(3)).toBe(false);
  });

  test("Should return false for an object", () => {
    expect(validator.validateAdmVoteForDelegateName({})).toBe(false);
  });

  test("Should return false for undefined", () => {
    expect(validator.validateAdmVoteForDelegateName(undefined)).toBe(false);
  });

  test("Should return false for NaN", () => {
    expect(validator.validateAdmVoteForDelegateName(undefined)).toBe(false);
  });

  test("Should return false for a short string", () => {
    expect(validator.validateAdmVoteForDelegateName("0f")).toBe(false);
  });

  test("Should return false for a vote without delegate name", () => {
    expect(validator.validateAdmVoteForDelegateName("+")).toBe(false);
  });

  test("Should return false for a too long delegate name", () => {
    expect(
      validator.validateAdmVoteForDelegateName(
        "+e003f782cd1c1c84A6767a871321af2e",
      ),
    ).toBe(false);
  });

  test("Should return false for a vote that starts with a number", () => {
    expect(validator.validateAdmVoteForDelegateName("4darksinc")).toBe(false);
  });

  test("Should return false for a vote that starts with a letter", () => {
    expect(validator.validateAdmVoteForDelegateName("darksinc")).toBe(false);
  });

  test("Should return true for a delegate name with a plus", () => {
    expect(validator.validateAdmVoteForDelegateName("+darksinc")).toBe(true);
  });

  test("Should return true for a delegate name with a minus", () => {
    expect(validator.validateAdmVoteForDelegateName("+darksinc")).toBe(true);
  });
});

describe("validateMessage", () => {
  test("Result should be false for a number message", () => {
    expect(validator.validateMessage(3).result).toBe(false);
  });

  test("Result should be false for an object message", () => {
    expect(validator.validateMessage({}).result).toBe(false);
  });

  test("Result should be true for a string message", () => {
    expect(validator.validateMessage("").result).toBe(true);
  });

  test("Result should be false for a string rich message", () => {
    expect(validator.validateMessage("", 2).result).toBe(false);
  });

  test("Result should be false for a string signal message", () => {
    expect(validator.validateMessage("", 3).result).toBe(false);
  });

  test("Result should be false for an empty json rich message", () => {
    expect(validator.validateMessage("{}", 2).result).toBe(false);
  });

  test("Result should be false for an empty json signal message", () => {
    expect(validator.validateMessage("{}", 3).result).toBe(false);
  });

  test("Result should be true for a json rich message with the given amount", () => {
    expect(validator.validateMessage('{"amount": "0.13"}', 2).result).toBe(
      true,
    );
  });

  test("Result should be true for a json signal message with the given amount", () => {
    expect(validator.validateMessage('{"amount": "0.13"}', 3).result).toBe(
      true,
    );
  });

  test("Result should be false for a json rich message with upercase coin name", () => {
    expect(
      validator.validateMessage(
        '{"amount": "0.13", "type": "ETH_transaction"}',
        2,
      ).result,
    ).toBe(false);
  });

  test("Result should be false for a json signal message with upercase coin name", () => {
    expect(
      validator.validateMessage(
        '{"amount": "0.13", "type": "ETH_transaction"}',
        3,
      ).result,
    ).toBe(false);
  });

  test("Result should be true for a json rich message with lowercase coin name", () => {
    expect(
      validator.validateMessage(
        '{"amount": "0.13", "type": "eth_transaction"}',
        2,
      ).result,
    ).toBe(true);
  });

  test("Result should be true for a json signal message with lowercase coin name", () => {
    expect(
      validator.validateMessage(
        '{"amount": "0.13", "type": "eth_transaction"}',
        3,
      ).result,
    ).toBe(true);
  });
});
