import {getTransactionId} from '../id';

describe('getTransactionId', () => {
  it('should return the same id as a node for message transaction', () => {
    const id = getTransactionId({
      type: 8,
      amount: 0,
      timestamp: 194049840,
      asset: {
        chat: {
          message: '7189aba904138dd1d53948ed1e5b1d18a11ba1910834',
          own_message: '8b717d0a9142e697cafd342c8f79f042c47a9e712e8a61b6',
          type: 1,
        },
      },
      recipientId: 'U12605277787100066317',
      senderId: 'U8084717991279447871',
      senderPublicKey:
        '09c93f2667728c62d2279bbb8df34c3856088290167f557c33594dc212da054a',
      signature:
        '304a4cb7e11651d576e2c4dffb4100bef5385981807f18c3267c863daf60bd277706e6790157beacf5100c77b6798c4725f2f4e070ca78496ff53a4c2e437f02',
    });

    // https://ahead.adamant.im/api/transactions/get?id=5505818610983968576&returnAsset=1
    expect(id).toBe('5505818610983968576');
  });

  it('should return the same id as a node for transfer transaction', () => {
    const id = getTransactionId({
      type: 8,
      amount: 0,
      senderId: 'U3716604363012166999',
      senderPublicKey:
        '1ed651ec1c686c23249dadb2cb656edd5f8e7d35076815d8a81c395c3eed1a85',
      asset: {
        chat: {
          message:
            'beeac1b98d27cb2052edaf37e2843838b25fa8eb6cccaa076a2b66db179207ff76a2233822218143fddbcb5d034da27d1a7b088bab2012b16ac9574995dadeaf2783afcaa6b960cdcd680761895b16f004736aea55f1fb46417fd2816da35c00960c2d40e9e5e96ab52d97c5d97fe72d2fca2a6ef5225dd46ad380edfa27de6bd8b0f3f3a6c8166da3bff716db4e42699d116668403da7eb742f640ffc69a7122111e1e0db9bf3f65ae6c3380d3436d7a6',
          own_message: '1111240165c825cf31164cc05fb6d40b58d72493d8798390',
          type: 2,
        },
      },
      recipientId: 'U8084717991279447871',
      timestamp: 194374197,
      signature:
        'bf9912ab59fe93780433c18e27d3634d8e78112e53379bcac7fc52a46cf90071c147d9dee06497441928afdb6e59501dce679788b3322e97be93178d9f7c7c0d',
    });

    // https://ahead.adamant.im/api/transactions/get?id=10707920525275969664&returnAsset=1
    expect(id).toBe('10707920525275969664');
  });
});
