import {
  getUnsupportedTransactionQueryControls,
  hasMixedTransactionQueryGroups,
  transformTransactionQuery,
} from '../utils';

describe('transformTransactionQuery', () => {
  it('returns an empty object for an undefined query', () => {
    expect(transformTransactionQuery(undefined)).toStrictEqual({});
  });

  it('should transform `or` and `and` object properties', () => {
    const transformed = transformTransactionQuery({
      or: {
        maxAmount: 50000000,
        senderPublicKey:
          '801846655523f5e21f2d454b2f98f70aaf5d3887c806463100a1764a4e7c1457',
        senderPublicKeys: [
          '801846655523f5e21f2d454b2f98f70aaf5d3887c806463100a1764a4e7c1457',
          '4ef885053c630041f57493343d7f6023107c5dc8b8148147e732c93',
        ],
      },
      and: {
        blockId: '7917597195203393333',
        fromHeight: 10336065,
        toHeight: 11,
        minAmount: 1000000000000001,
        senderId: 'U15423595369615486571',
        senderIds: ['U18132012621449491414', 'U15881344309699504778'],
        recipientId: 'U15423595369615486571',
        recipientIds: ['U18132012621449491414', 'U15881344309699504778'],
        recipientPublicKey:
          '801846655523f5e21f2d454b2f98f70aaf5d3887c806463100a1764a4e7c1457',
        recipientPublicKeys: [
          '801846655523f5e21f2d454b2f98f70aaf5d3887c806463100a1764a4e7c1457',
          '4ef885053c630041f57493343d7f6023107c5dc8b8148147e732c93',
        ],
        inId: 'U100739400829575109',
        type: 2,
        types: [9, 0],
        key: 'eth:address',
        keyIds: ['eth:address', 'doge:address', 'dash:address'],
      },
    });

    expect(transformed).toStrictEqual({
      'or:maxAmount': 50000000,
      'or:senderPublicKey':
        '801846655523f5e21f2d454b2f98f70aaf5d3887c806463100a1764a4e7c1457',
      'or:senderPublicKeys': [
        '801846655523f5e21f2d454b2f98f70aaf5d3887c806463100a1764a4e7c1457',
        '4ef885053c630041f57493343d7f6023107c5dc8b8148147e732c93',
      ],
      'and:blockId': '7917597195203393333',
      'and:fromHeight': 10336065,
      'and:toHeight': 11,
      'and:minAmount': 1000000000000001,
      'and:senderId': 'U15423595369615486571',
      'and:senderIds': ['U18132012621449491414', 'U15881344309699504778'],
      'and:recipientId': 'U15423595369615486571',
      'and:recipientIds': ['U18132012621449491414', 'U15881344309699504778'],
      'and:recipientPublicKey':
        '801846655523f5e21f2d454b2f98f70aaf5d3887c806463100a1764a4e7c1457',
      'and:recipientPublicKeys': [
        '801846655523f5e21f2d454b2f98f70aaf5d3887c806463100a1764a4e7c1457',
        '4ef885053c630041f57493343d7f6023107c5dc8b8148147e732c93',
      ],
      'and:inId': 'U100739400829575109',
      'and:type': 2,
      'and:types': [9, 0],
      'and:key': 'eth:address',
      'and:keyIds': ['eth:address', 'doge:address', 'dash:address'],
    });
  });

  it('combines top-level filter conditions with `and` by default', () => {
    const transformed = transformTransactionQuery({
      minAmount: 5000,
      senderId: 'U15423595369615486571',
      senderIds: ['U18132012621449491414', 'U15881344309699504778'],
      type: 0,
      types: [0, 8],
    });

    expect(transformed).toStrictEqual({
      'and:minAmount': 5000,
      'and:senderId': 'U15423595369615486571',
      'and:senderIds': ['U18132012621449491414', 'U15881344309699504778'],
      'and:type': 0,
      'and:types': [0, 8],
    });
  });

  it('passes transaction controls through and strips chat-only controls', () => {
    const transformed = transformTransactionQuery({
      limit: 20,
      offset: 40,
      orderBy: 'timestamp:desc',
      returnUnconfirmed: 1,
      returnAsset: 1,
      includeDirectTransfers: true,
      userId: 'U123456',
    });

    expect(transformed).toStrictEqual({
      limit: 20,
      offset: 40,
      orderBy: 'timestamp:desc',
      returnUnconfirmed: 1,
      returnAsset: 1,
    });
  });

  it('passes only the controls supported by chat endpoints', () => {
    const transformed = transformTransactionQuery(
      {
        type: 8,
        returnAsset: 1,
        includeDirectTransfers: true,
        userId: 'U123456',
        and: {withoutDirectTransfers: false},
      },
      'chatrooms',
    );

    expect(transformed).toStrictEqual({
      'and:type': 8,
      includeDirectTransfers: true,
      userId: 'U123456',
      withoutDirectTransfers: false,
    });
  });

  it('keeps control parameters unprefixed while defaulting filters to `and`', () => {
    const transformed = transformTransactionQuery({
      type: 0,
      recipientId: 'U15423595369615486571',
      limit: 20,
      orderBy: 'timestamp:desc',
    });

    expect(transformed).toStrictEqual({
      'and:type': 0,
      'and:recipientId': 'U15423595369615486571',
      limit: 20,
      orderBy: 'timestamp:desc',
    });
  });

  it('supports an explicit `or` group alongside default-and top-level filters', () => {
    const transformed = transformTransactionQuery({
      type: 8,
      or: {
        senderId: 'U111',
        recipientId: 'U222',
      },
      limit: 10,
    });

    expect(transformed).toStrictEqual({
      'and:type': 8,
      'or:senderId': 'U111',
      'or:recipientId': 'U222',
      limit: 10,
    });
  });

  it('preserves object insertion order for flat mixed logical groups', () => {
    const andThenOr = transformTransactionQuery({
      and: {senderId: 'U111'},
      or: {recipientId: 'U222'},
    });
    const orThenAnd = transformTransactionQuery({
      or: {recipientId: 'U222'},
      and: {senderId: 'U111'},
    });

    expect(Object.keys(andThenOr)).toEqual(['and:senderId', 'or:recipientId']);
    expect(Object.keys(orThenAnd)).toEqual(['or:recipientId', 'and:senderId']);
  });
});

describe('getUnsupportedTransactionQueryControls', () => {
  it('deduplicates unsupported controls across query groups', () => {
    expect(
      getUnsupportedTransactionQueryControls(
        {
          returnAsset: 1,
          and: {returnAsset: 1, includeDirectTransfers: true},
          or: {userId: 'U123456'},
        },
        'chats',
      ),
    ).toEqual(['returnAsset', 'userId']);
  });

  it('does not report controls supported by the selected endpoint', () => {
    expect(
      getUnsupportedTransactionQueryControls(
        {
          returnAsset: 1,
          limit: 10,
        },
        'transactions',
      ),
    ).toEqual([]);
  });
});

describe('hasMixedTransactionQueryGroups', () => {
  it('detects explicit and implicit AND filters combined with OR filters', () => {
    expect(
      hasMixedTransactionQueryGroups({
        type: 8,
        or: {recipientId: 'U222'},
      }),
    ).toBe(true);
    expect(
      hasMixedTransactionQueryGroups({
        and: {senderId: 'U111'},
        or: {recipientId: 'U222'},
      }),
    ).toBe(true);
  });

  it('ignores controls and single-operator queries', () => {
    expect(
      hasMixedTransactionQueryGroups({
        limit: 10,
        or: {recipientId: 'U222'},
      }),
    ).toBe(false);
    expect(
      hasMixedTransactionQueryGroups({
        type: 8,
        and: {senderId: 'U111'},
      }),
    ).toBe(false);
  });
});
