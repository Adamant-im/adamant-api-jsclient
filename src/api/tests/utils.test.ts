import {transformTransactionQuery} from '../utils';

describe('transformTransactionQuery', () => {
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

  it('should NOT transform object properties other than `or` and `and`', () => {
    const transformed = transformTransactionQuery({
      minAmount: 5000,
      senderId: 'U15423595369615486571',
      senderIds: ['U18132012621449491414', 'U15881344309699504778'],
      and: {
        maxAmount: 6000,
      },
      or: {
        recipientIds: ['U18132012621449491414', 'U15881344309699504778'],
      },
    });

    expect(transformed).toStrictEqual({
      minAmount: 5000,
      senderId: 'U15423595369615486571',
      senderIds: ['U18132012621449491414', 'U15881344309699504778'],
      'and:maxAmount': 6000,
      'or:recipientIds': ['U18132012621449491414', 'U15881344309699504778'],
    });
  });
});
