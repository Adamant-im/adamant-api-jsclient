/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

/** @example {"account":{"address":"U777355171330060015","unconfirmedBalance":"4509718944753","balance":"4509718944753","publicKey":"a9407418dafb3c8aeee28f3263fd55bae0f528a5697a9df0e77e6568b19dfe34","unconfirmedSignature":0,"secondSignature":0,"secondPublicKey":null,"multisignatures":[],"u_multisignatures":[]},"success":true,"nodeTimestamp":58030181} */
export interface GetAccountInfoResponseDto {
  account: AccountDto;
  success: boolean;
  nodeTimestamp: number;
}

/** @example {"balance":"4509718944753","unconfirmedBalance":"4509718944753","success":true,"nodeTimestamp":58043820} */
export interface GetAccountBalanceResponseDto {
  /** @format int64 */
  balance: string;
  /** @format int64 */
  unconfirmedBalance: string;
  success: boolean;
  nodeTimestamp: number;
}

/** @example {"publicKey":"a9407418dafb3c8aeee28f3263fd55bae0f528a5697a9df0e77e6568b19dfe34","balance":"4509718944753","unconfirmedBalance":"4509718944753"} */
export interface GetAccountPublicKeyResponseDto {
  /** 256 bit public key of ADAMANT address in hex format */
  publicKey: PublicKey;
  success: boolean;
  nodeTimestamp: number;
}

/** @example {"publicKey":"a9407418dafb3c8aeee28f3263fd55bae0f528a5697a9df0e77e6568b19dfe34","balance":"4509718944753","unconfirmedBalance":"4509718944753"} */
export interface CreateNewAccountRequestBody {
  /** 256 bit public key of ADAMANT address in hex format */
  publicKey: PublicKey;
  success: boolean;
  nodeTimestamp: number;
}

/** @example {"account":{"address":"U4697606961271319613","unconfirmedBalance":"0","balance":"0","publicKey":"bee368cc0ce2974adcbcc97e649ac18a031492a579034abed5f77d667001d450","unconfirmedSignature":0,"secondSignature":0,"secondPublicKey":null,"multisignatures":null,"u_multisignatures":null},"success":true,"nodeTimestamp":63205623} */
export interface CreateNewAccountResponseDto {
  account: AccountDto;
  success: boolean;
  nodeTimestamp: number;
}

export interface GetBlockInfoResponseDto {
  block: BlockInfoDto;
  success: boolean;
  nodeTimestamp: number;
}

export interface GetBlocksResponseDto {
  blocks: BlockInfoDto[];
  success: boolean;
  nodeTimestamp: number;
}

export interface GetChatRoomsResponseDto {
  chats: {
    lastTransaction?: TokenTransferTransaction | ChatMessageTransaction;
    participants?: ChatParticipant[];
  }[];
  success: boolean;
  nodeTimestamp: number;
}

export interface GetChatMessagesResponseDto {
  messages: (TokenTransferTransaction | ChatMessageTransaction)[];
  participants: ChatParticipant[];
  success: boolean;
  nodeTimestamp: number;
}

export interface GetChatTransactionsResponseDto {
  transactions: ChatMessageTransaction[];
  /** Number in string format */
  count: string;
  success: boolean;
  nodeTimestamp: number;
}

export interface CreateNewChatMessageRequestBody {
  transaction: RegisterChatMessageTransaction;
}

/** @example {"success":true,"nodeTimestamp":63205623,"transactionId":"2515012750420367858"} */
export interface CreateNewChatMessageResponseDto {
  success: boolean;
  nodeTimestamp: number;
  transactionId: string;
}

export interface GetDelegatesResponseDto {
  delegates: DelegateDto[];
  /** @example 254 */
  totalCount: number;
  /** @example true */
  success: boolean;
  /** @example 61762271 */
  nodeTimestamp: number;
}

export interface GetDelegateResponseDto {
  delegate: DelegateDto;
  /** @example true */
  success: boolean;
  /** @example 61762271 */
  nodeTimestamp: number;
}

export type RegisterDelegateRequestBody = RegisterNewDelegateTransaction;

export interface RegisterDelegateResponseDto {
  transaction: RegisterDelegateTransactionDto;
  /** @example true */
  success: boolean;
  /** @example 61762271 */
  nodeTimestamp: number;
}

export interface SearchDelegateResponseDto {
  delegates: SearchDelegateDto[];
  /** @example true */
  success: boolean;
  /** @example 61762271 */
  nodeTimestamp: number;
}

export interface GetDelegatesCountResponseDto {
  /** @example 255 */
  count: number;
  /** @example true */
  success: boolean;
  /** @example 61762271 */
  nodeTimestamp: number;
}

export interface GetDelegateStatsResponseDto {
  /**
   * Total sum of fees forged by delegate
   * @example "586039475511"
   */
  fees: string;
  /**
   * Total sum of rewards made by delegate
   * @example "3943485000000"
   */
  rewards: string;
  /**
   * Total sum of forged tokens
   * @example "4529524475511"
   */
  forged: string;
  /** @example true */
  success: boolean;
  /** @example 61762271 */
  nodeTimestamp: number;
}

export interface GetNextForgersResponseDto {
  /**
   * Array of next forgers public keys
   * @example ["677c6db63548c99674fed0571da522a6a9569d0c1da9669734a3625645519641","150d638714f65845b50f1ff58f3da2c2baa3a1dc8bf59a9884c10da5a8e951c6"]
   */
  delegates: string[];
  /**
   * Current slot number
   * @example 11610423
   */
  currentSlot: number;
  /**
   * Current blockchain height
   * @example 10146268
   */
  currentBlock: number;
  /**
   * Current block slot number
   * @example 11610422
   */
  currentBlockSlot: number;
  /** @example true */
  success: boolean;
  /** @example 61762271 */
  nodeTimestamp: number;
}

export interface GetVotersResponseDto {
  accounts: VoterDto[];
  /** @example true */
  success: boolean;
  /** @example 61762271 */
  nodeTimestamp: number;
}

export interface GetAccountVotesResponseDto {
  /** List of delegates account voted for. */
  delegates: DelegateDto[];
  /** @example true */
  success: boolean;
  /** @example 61762271 */
  nodeTimestamp: number;
}

export type RegisterVotesRequestBody = RegisterVoteForDelegateTransaction;

export interface RegisterVotesResponseDto {
  transaction: RegisterVotesTransactionDto;
  /** @example true */
  success: boolean;
  /** @example 61762271 */
  nodeTimestamp: number;
}

export interface GetPeersResponseDto {
  peers: PeerDto[];
  success: boolean;
  nodeTimestamp: number;
}

/** @example {"loaded":true,"now":10144343,"blocksCount":0,"success":true,"nodeTimestamp":58052355} */
export interface GetLoadingStatusResponseDto {
  loaded: boolean;
  now: number;
  blocksCount: number;
  success: boolean;
  nodeTimestamp: number;
}

/** @example {"success":true,"nodeTimestamp":58052355,"syncing":false,"blocks":0,"height":10146332,"broadhash":"09f2f5614cf7209979dc1df2dd92d16aade904dae6c9b68bccaeb234647b3c18","consensus":94.32} */
export interface GetSyncStatusResponseDto {
  success: boolean;
  nodeTimestamp: number;
  syncing: boolean;
  blocks: number;
  height: number;
  broadhash: string;
  consensus: number;
}

/** @example {"success":true} */
export interface GetPingStatusResponseDto {
  success: boolean;
}

export type GetNodeVersionResponseDto = NodeVersion & {
  /** @example true */
  success: boolean;
  /** @example 58052984 */
  nodeTimestamp: number;
};

/** @example {"success":true,"nodeTimestamp":58052355,"broadhash":"e1aedd2818679c174e3f6e31891c34f4069927f33f145e1b81fe5d978733e794"} */
export interface GetBroadhashResponseDto {
  success: boolean;
  nodeTimestamp: number;
  /** Broadhash is established as an aggregated rolling hash of the past five blocks present in the database */
  broadhash: string;
}

/** @example {"success":true,"nodeTimestamp":58646306,"epoch":"2017-09-02T17:00:00.000Z"} */
export interface GetEpochResponseDto {
  success: boolean;
  nodeTimestamp: number;
  /** Time when blockchain epoch starts. Value `2017-09-02T17:00:00.000Z` is for mainnet. */
  epoch: string;
}

/** @example {"success":true,"nodeTimestamp":58646306,"height":10145318} */
export interface GetHeightResponseDto {
  success: boolean;
  nodeTimestamp: number;
  /** Current node height. */
  height: number;
}

/** @example {"success":true,"nodeTimestamp":58646306,"fee":50000000} */
export interface GetTokenTransferFeeResponseDto {
  success: boolean;
  nodeTimestamp: number;
  /** Current fee value for `type 0` (token transfer) transactions. Integer amount of 1/10^8 ADM tokens (1 ADM = 100000000). */
  fee: number;
}

export interface GetTransactionTypesFeesResponseDto {
  /** @example true */
  success: boolean;
  /** @example 58646306 */
  nodeTimestamp: number;
  fees: TransactionTypesFeesDto;
}

/** @example {"success":true,"nodeTimestamp":58646306,"nethash":"bd330166898377fb28743ceef5e43a5d9d0a3efd9b3451fb7bc53530bb0a6d64"} */
export interface GetNethashResponseDto {
  success: boolean;
  nodeTimestamp: number;
  /** The `nethash` describes e.g. the Mainnet or the Testnet, that the node is connecting to. */
  nethash: string;
}

/** @example {"success":true,"nodeTimestamp":58646306,"milestone":1} */
export interface GetMilestoneResponseDto {
  success: boolean;
  nodeTimestamp: number;
  /** Current slot height, which determines reward a delegate will get for forging a block. */
  milestone: number;
}

/** @example {"success":true,"nodeTimestamp":58646306,"reward":45000000} */
export interface GetRewardResponseDto {
  success: boolean;
  nodeTimestamp: number;
  /** The reward a delegate will get for forging a block. Integer amount of 1/10^8 ADM tokens (1 ADM = 100000000). Depends on the slot height. */
  reward: number;
}

/** @example {"success":true,"nodeTimestamp":58646306,"supply":10198038140000000} */
export interface GetTokensTotalSupplyResponseDto {
  success: boolean;
  nodeTimestamp: number;
  /** Total current supply of ADM tokens in the network. Integer amount of 1/10^8 ADM tokens (1 ADM = 100000000). Total supply increases with every new forged block. */
  supply: number;
}

export type GetNetworkInfoResponseDto = NetworkStatus & {
  success: boolean;
  nodeTimestamp: number;
};

export interface GetNodeStatusResponseDto {
  /** @example true */
  success: boolean;
  /** @example 58052984 */
  nodeTimestamp: number;
  network: NetworkStatus;
  version: NodeVersion;
  wsClient: WsClient;
}

export interface GetKVSResponseDto {
  transactions: KVSTransaction[];
  /**
   * Integer in string format
   * @example "1"
   */
  count: string;
  /** @example true */
  success: boolean;
  /** @example 63647706 */
  nodeTimestamp: number;
}

export interface SetKVSRequestBody {
  transaction: RegisterKVSTransaction;
}

/** @example {"success":true,"nodeTimestamp":63410860,"transactionId":"3888802408802922744"} */
export interface SetKVSResponseDto {
  success: boolean;
  nodeTimestamp: number;
  transactionId: string;
}

export interface GetTransactionsResponseDto {
  transactions: AnyTransaction[];
  /**
   * Integer in string format
   * @example "1"
   */
  count: string;
  /** @example true */
  success: boolean;
  /** @example 63647706 */
  nodeTimestamp: number;
}

export interface GetTransactionByIdResponseDto {
  transaction: AnyTransaction;
  /** @example true */
  success: boolean;
  /** @example 63647706 */
  nodeTimestamp: number;
}

/** @example {"success":true,"nodeTimestamp":59979539,"confirmed":256953,"unconfirmed":44,"queued":4,"multisignature":0} */
export interface GetTransactionsCountResponseDto {
  success: boolean;
  nodeTimestamp: number;
  confirmed: number;
  unconfirmed: number;
  queued: number;
  multisignature: number;
}

export interface GetQueuedTransactionsResponseDto {
  transactions: QueuedTransaction[];
  /**
   * Integer in string format
   * @example "1"
   */
  count: string;
  /** @example true */
  success: boolean;
  /** @example 63647706 */
  nodeTimestamp: number;
}

export interface GetQueuedTransactionByIdResponseDto {
  transaction: QueuedTransaction;
  /** @example true */
  success: boolean;
  /** @example 63647706 */
  nodeTimestamp: number;
}

export interface GetUnconfirmedTransactionsResponseDto {
  transactions: QueuedTransaction[];
  /**
   * Integer in string format
   * @example "1"
   */
  count: string;
  /** @example true */
  success: boolean;
  /** @example 63647706 */
  nodeTimestamp: number;
}

export interface GetUnconfirmedTransactionByIdResponseDto {
  transaction: QueuedTransaction;
  /** @example true */
  success: boolean;
  /** @example 63647706 */
  nodeTimestamp: number;
}

export interface TransferTokenRequestBody {
  transaction: RegisterTokenTransferTransaction;
}

export interface TransferTokenResponseDto {
  /** @example "6146865104403680934" */
  transactionId: string;
  /** @example true */
  success: boolean;
  /** @example 63647706 */
  nodeTimestamp: number;
}

export interface RegisterTransactionRequestBody {
  transaction: RegisterAnyTransaction;
}

export interface RegisterTransactionResponseDto {
  /** @example "6146865104403680934" */
  transactionId: string;
  /** @example true */
  success: boolean;
  /** @example 63647706 */
  nodeTimestamp: number;
}

/**
 * 256 bit public key of ADAMANT address in hex format
 * @example "ef5e78a3d02e6d82f4ac0c5b8923c1b86185bd17c27c9ac027c20ec62db79a84"
 */
export type PublicKey = string;

export interface AccountDto {
  address: string;
  /** @format int64 */
  unconfirmedBalance: string;
  /** @format int64 */
  balance: string;
  /** 256 bit public key of ADAMANT address in hex format */
  publicKey: PublicKey;
  unconfirmedSignature: number;
  secondSignature: number;
  secondPublicKey: string | null;
  /** @example [] */
  multisignatures: string[];
  /** @example [] */
  u_multisignatures: string[];
}

/** @example {"id":"11114690216332606721","version":0,"timestamp":61741820,"height":10873829,"previousBlock":"11483763337863654141","numberOfTransactions":1,"totalAmount":10000000,"totalFee":50000000,"reward":45000000,"payloadLength":117,"payloadHash":"f7c0fa338a3a848119cad999d8035ab3fcb3d274a4555e141ebeb86205e41345","generatorPublicKey":"134a5de88c7da1ec71e75b5250d24168c6c6e3965ff16bd71497bd015d40ea6a","generatorId":"U3238410389688281135","blockSignature":"18607b15417a6b0a56b4c74cacd713ad7a10df16ec3ab45a697fa72b6f811f9213d895b7e0fbca71cf74323d60148d0991668e5368386408f4d841496ed2280d","confirmations":1093,"totalForged":"95000000"} */
export interface BlockInfoDto {
  /** @format int64 */
  id: string;
  version: number;
  timestamp: number;
  height: number;
  /** @format int64 */
  previousBlock: string;
  numberOfTransactions: number;
  totalAmount: number;
  totalFee: number;
  reward: number;
  payloadLength: number;
  payloadHash: string;
  generatorId: string;
  blockSignature: string;
  confirmations: number;
  /** @format int64 */
  totalForged: string;
}

export interface BaseTransaction {
  id: string;
  height: number;
  blockId: string;
  /**
   * Type of transaction. See [Transaction Types](https://github.com/Adamant-im/adamant/wiki/Transaction-Types).
   * @min 0
   * @max 9
   * @example 0
   */
  type: number;
  block_timestamp: number;
  timestamp: number;
  senderPublicKey: string;
  senderId: string;
  recipientId: string;
  recipientPublicKey: string;
  /**
   * Amount to transfer, 8 decimal points (100000000 equals to 1 ADM). For non-transfer transactions must be `0`
   * @format int64
   */
  amount: number;
  /** Fee for operation. Depends on [Transaction Type](https://github.com/Adamant-im/adamant/wiki/Transaction-Types) */
  fee: number;
  signature: string;
  signatures: string[];
  confirmations: number;
  /** @example {} */
  asset: object;
}

/**
 * An empty object
 * @example {}
 */
export type TokenTransferAsset = object;

/** @example {"id":16682447412632443000,"height":10527806,"blockId":2635215585577611300,"type":0,"block_timestamp":59979295,"timestamp":59979276,"senderPublicKey":"632816f2c44a08f282e85532443d73286cadc6d9820d5d25c9d50d8e01c668e0","senderId":"U17362714543155685887","recipientId":"U17819800352812315500","recipientPublicKey":"28994b2cd075fd442e6ce78fa8c07966ed122932ff07411fed3c918e495586e2","amount":100000000,"fee":50000000,"signature":"1db7e9111eaca790b73d51c32572739c46fcba3962aff55ca47ecf9a8c9fcb82c323de39ed60bc87d81a1245d43b5351b9dd44ad70128d78536250168b64c408","signatures":[],"confirmations":18431929,"asset":{}} */
export type TokenTransferTransaction = BaseTransaction & {
  /**
   * Always equal to `0`
   * @example 0
   */
  type: 0;
  /** An empty object */
  asset: TokenTransferAsset;
};

/** @example {"chat":{"message":"748e4e9cffc969dfa4c1d7b9b708cb171c9e","own_message":"96904970891b838c9a3ab1b9a6f31ec194ec94ffaa95d0cd","type":1}} */
export interface ChatMessageAsset {
  chat: {
    /** Encrypted message */
    message: string;
    /** Nonce */
    own_message: string;
    /** Type of chat message (1 - Basic Encrypted Message, 2 - Rich Content Message, 3 - Signal Message). See details https://github.com/Adamant-im/adamant/wiki/Message-Types */
    type: 1 | 2 | 3;
  };
}

/** @example {"id":17242227802580636000,"height":7583081,"blockId":10363608465961390000,"type":8,"block_timestamp":64874935,"timestamp":64874929,"senderPublicKey":"b34d48d8d70b3a91f766df34789abf0cad62da7207e171d997508a460217c5d3","senderId":"U13267906643444995032","recipientId":"U9203183357885757380","recipientPublicKey":"741d3d1f52e609eef981e9ab370ec1e7c3ff70cafad94691937a2bb6d84bbff2","amount":0,"fee":100000,"signature":"8803346cf43457aba3480311ee489706ec66493fa043c4d1732682eb86e88d96f36a7e87c1d0d00dd3963f75e763e5554df402ee0aa79bd59bd55185a6e49a03","signatures":[],"confirmations":23229462,"asset":{"chat":{"message":"2f045f1d4a5198843999e2948b0cc78806","own_message":"a7cd3fa21e543dcc9f0564387d83c4d862137a2da37f29d4","type":1}}} */
export type ChatMessageTransaction = BaseTransaction & {
  /**
   * Always equal to `8`
   * @example 8
   */
  type: 8;
  asset: ChatMessageAsset;
};

/**
 * ADAMANT address
 * @example "U8916295525136600565"
 */
export type AdamantAddress = string;

export interface ChatParticipant {
  /** ADAMANT address */
  address: AdamantAddress;
  /** 256 bit public key of ADAMANT address in hex format */
  publicKey: PublicKey;
}

/** @example {"type":0,"amount":0,"senderId":"U14236667426471084862","senderPublicKey":"8cd9631f9f634a361ea3b85cbd0df882633e39e7d26d7bc615bbcf75e41524ef","signature":"b3982d603be8f0246fa663e9f012bf28b198cd28f82473db1eb4a342d890f7a2a2c1845db8d256bb5bce1e64a9425822a91e10bf960a2e0b55e20b4841e4ae0b","timestamp":63228852} */
export interface RegisterTransactionBase {
  type: number;
  amount: number;
  senderId: string;
  senderPublicKey: string;
  signature: string;
  timestamp: number;
}

export type RegisterChatMessageTransaction = RegisterTransactionBase & {
  /**
   * Always equal to `8`
   * @example 8
   */
  type: 8;
  recipientId: string;
  asset: ChatMessageAsset;
};

/** @example {"username":"galaxy","address":"U17457189553820283321","publicKey":"7e26562594685ba12c0bb99ae80692947828afb71962d54634795d78b3ea7023","vote":"248994436803629","votesWeight":"83910064952101","producedblocks":269879,"missedblocks":567,"rate":10,"rank":10,"approval":0.76,"productivity":99.79} */
export interface DelegateDto {
  /** Unique delegate's nickname */
  username: string;
  /** Delegate address */
  address: string;
  /** Delegate Public Key */
  publicKey: string;
  /** Vote weight (obsolete, not used) */
  vote: string;
  /** Vote weight (Fair Delegate System) */
  votesWeight: string;
  /** Count of produced blocks */
  producedlocks?: number;
  /** Count of missed blocks */
  missedblocks: number;
  /** Current position in the Delegates List */
  rate: number;
  /** Current position in the Delegates List */
  rank: number;
  /** Share of votes of all votes in the system */
  approval: number;
  /** Productivity / Uptime of a delegate. If `0`, delegate is not active now */
  productivity: number;
}

/** @example {"type":2,"amount":0,"senderId":"U3031563782805250428","senderPublicKey":"a339974effc141f302bd3589c603bdc9468dd66bcc424b60025b36999eb69ca3","signature":"c2e4a3ef7f0d363611a2b22b96feff269f1a0cbb61741a2ce55756bb9324826092fd9bff6348145e3cc384c097f101a493b9136da5236292ecf8b1ed6657dd01","timestamp":166805250,"asset":{"delegate":{"username":"kpeo","publicKey":"a339974effc141f302bd3589c603bdc9468dd66bcc424b60025b36999eb69ca3"}}} */
export type RegisterNewDelegateTransaction = RegisterTransactionBase & {
  /**
   * Should be always equal to `2`
   * @example 2
   */
  type: 2;
  asset: {
    delegate: {
      username: string;
      /** 256 bit public key of ADAMANT address in hex format */
      publicKey: PublicKey;
    };
  };
};

export interface QueuedTransaction {
  /** @example "U14236667426471084862" */
  recipientId: string;
  /** @example 0 */
  amount: number;
  /**
   * See [Transaction Types](https://github.com/Adamant-im/adamant/wiki/Transaction-Types)
   * @min 0
   * @max 9
   * @example 3
   */
  type: number;
  /** @example "U14236667426471084862" */
  senderId: string;
  /** @example "8cd9631f9f634a361ea3b85cbd0df882633e39e7d26d7bc615bbcf75e41524ef" */
  senderPublicKey: string;
  /** @example 63394407 */
  timestamp?: number;
  /** @example "7f4f5d240fc66da1cbdb3fe291d6fcec006848236355aebe346fcd1e3ba500caeac1ed0af6f3d7f912a889a1bbedc1d7bab17b6ebd36386b81df78189ddf7c07" */
  signature: string;
  /** @example "13616514419605573351" */
  id: string;
  /** @example 5000000000 */
  fee: number;
  /** @example 1 */
  relays: number;
  /**
   * Date and time in ISO 8601 format
   * @example "2019-09-06T10:33:28.054Z"
   */
  receivedAt: string;
}

/** @example {"delegate":{"address":"U3031563782805250428","username":"kpeo","publicKey":"a339974effc141f302bd3589c603bdc9468dd66bcc424b60025b36999eb69ca3"}} */
export interface RegisterDelegateAsset {
  delegate: {
    /** ADAMANT address */
    address: AdamantAddress;
    username: string;
    /** 256 bit public key of ADAMANT address in hex format */
    publicKey: PublicKey;
  };
}

export type RegisterDelegateTransactionDto = QueuedTransaction & {
  asset: RegisterDelegateAsset;
  /**
   * Always equal to `2`
   * @example 2
   */
  type: 2;
  /**
   * Always equal to `300000000000`
   * @example 300000000000
   */
  fee?: 300000000000;
};

export type SearchDelegateDto = DelegateDto & {
  /**
   * Number of accounts who voted for delegate
   * @example 12
   */
  voters_cnt: number;
  /**
   * Epoch timestamp of when delegate was registered
   * @example 45523238
   */
  register_timestamp: number;
};

/** @example {"username":"leg","address":"U12609717384103730908","publicKey":"559418798f67a81b7f893aa8eab1218b9838a6b0bcd2bc8968c6d490ae0d5d77","balance":"506697"} */
export interface VoterDto {
  /** Voter's delegate username. `null` if address is not a delegate. */
  username: string | null;
  /** Voter's ADAMANT address */
  address: string;
  /** Voter's ADAMANT public key */
  publicKey: string;
  /** ADM balance of voter's ADAMANT wallet. Integer amount of 1/10^8 ADM tokens (1 ADM = 100000000) */
  balance: string;
}

/** @example {"votes":["-c0c580c3fb89409f32181fef58935f286f0c1bbf61bd727084ed915b3a4bc95b","ac903ab58135cd5f0613a929d876953214d224034b73c33e63bc153d669447f4"]} */
export interface VoteForDelegateAsset {
  votes: string[];
}

export type RegisterVoteForDelegateTransaction = RegisterTransactionBase & {
  asset: VoteForDelegateAsset;
  /**
   * ADAMANT address of account who votes. Same as `senderId`
   * @example "U14236667426471084862"
   */
  recipientId: string;
  /**
   * Should be always equal to `3`
   * @example 3
   */
  type: 3;
  /**
   * ADAMANT address of account who votes. Same as `recipientId`
   * @example "U14236667426471084862"
   */
  senderId: string;
};

export type RegisterVotesTransactionDto = QueuedTransaction & {
  asset: VoteForDelegateAsset;
  /**
   * Always equal to `3`
   * @example 3
   */
  type: 3;
  /** @example true */
  success: boolean;
  /** @example 61762271 */
  nodeTimestamp: number;
};

/** @example {"ip":"194.32.79.175","port":36666,"state":2,"os":"linux4.15.0-36-generic","version":"0.4.0","broadhash":"3dfdf6c7bbaf7537eac9c70432f7ba1cae835b9b15e4ecd97e147616dde67e62","height":10146365,"clock":null,"updated":1562424199553,"nonce":"jxXV6g0sHJhmDubq"} */
export interface PeerDto {
  /** IPv4 address of node */
  ip: string;
  /** Port number of ADAMANT node. `36666` for mainnet or `36667` for testnet */
  port: string;
  /** State of the peer. Available values: Connected (2), Disconnected, Banned */
  state: number;
  /** Node's operating system */
  os: string;
  /** ADAMANT node software version */
  version: string;
  /** Broadhash on the peer node. Broadhash is established as an aggregated rolling hash of the past five blocks present in the database. */
  broadhash: string;
  /** Current node's blockchain height */
  height: number;
  clock: string | null;
  /** Unix timestamp based in ms, when peer updated */
  updated: number;
  /** Unique Identifier for the peer. Random string. */
  nonce: string;
}

/** @example {"build":"","commit":"b07aaf9580dffb5cc95cc65f303f6f1e5fca7d9c","version":"0.5.2"} */
export interface NodeVersion {
  build: string;
  commit: string;
  version: string;
}

/** @example {"send":50000000,"vote":5000000000,"delegate":300000000000,"old_chat_message":500000,"chat_message":100000,"state_store":100000,"profile_update":5000000,"avatar_upload":10000000} */
export interface TransactionTypesFeesDto {
  /** Token transfer, type 0 */
  send: number;
  /** Voting for delegate, type 3 */
  vote: number;
  /** Registration of a new delegate, type 2 */
  delegate: number;
  /** Sending a message (not used for now) */
  old_chat_message: number;
  /** Sending a message, type 8 */
  chat_message: number;
  /** Storing data in KVS, type 9 */
  state_store: number;
  profile_update: number;
  avatar_upload: number;
}

/** @example {"broadhash":"4a28272c915f74d118120bb47db547a18a7512e1d48092c48be86939a6d45b89","epoch":"2017-09-02T17:00:00.000Z","height":10145334,"fee":50000000,"milestone":1,"nethash":"bd330166898377fb28743ceef5e43a5d9d0a3efd9b3451fb7bc53530bb0a6d64","reward":45000000,"supply":10198040075000000} */
export interface NetworkStatus {
  /** Broadhash is established as an aggregated rolling hash of the past five blocks present in the database */
  broadhash: string;
  /** Time when blockchain epoch starts. Value `2017-09-02T17:00:00.000Z` is for mainnet. */
  epoch: string;
  height: number;
  fee: number;
  /** Current slot height, which determines reward a delegate will get for forging a block. */
  milestone: number;
  /** The `nethash` describes e.g. the Mainnet or the Testnet, that the node is connecting to. */
  nethash: string;
  /** The reward a delegate will get for forging a block. Integer amount of 1/10^8 ADM tokens (1 ADM = 100000000). */
  reward: number;
  /** Total current supply of ADM tokens in the network. Integer amount of 1/10^8 ADM tokens (1 ADM = 100000000). */
  supply: number;
}

/** @example {"enabled":true,"port":36668} */
export interface WsClient {
  enabled: boolean;
  port: number;
}

/** @example {"state":{"key":"eth:address","value":"0x2391EEaEc07B927D2BA4Fa5cB3cE4b490Fa6fffC","type":0}} */
export interface KVSTransactionAsset {
  state: {
    key: string;
    value: string;
    type: 0;
  };
}

/** @example {"id":11325216963059857000,"height":3377231,"blockId":14121859709526400000,"type":9,"block_timestamp":23943500,"timestamp":23943500,"senderPublicKey":"ac903ab58135cd5f0613a929d876953214d224034b73c33e63bc153d669447f4","senderId":"U5517006347330072401","recipientId":null,"recipientPublicKey":null,"amount":0,"fee":100000,"signature":"4c3bcca1f6c921cef7ce07f4e641f668c5c0660bb6432335d5e2117c7a4d8378b352e7fa4fac3126bd7228f5b9ac5d57100bb161da02f7efc16df9f7e602b10d","signatures":[],"confirmations":7856415,"asset":{"state":{"key":"eth:address","value":"0x2391EEaEc07B927D2BA4Fa5cB3cE4b490Fa6fffC","type":0}}} */
export type KVSTransaction = BaseTransaction & {
  /**
   * Always equal to `9`
   * @example 9
   */
  type: 9;
  /** There is no recipient for this type of transaction */
  recipientId?: string | null;
  /** There is no recipient for this type of transaction */
  recipientPublicKey?: string | null;
  asset: KVSTransactionAsset;
};

export type RegisterKVSTransaction = RegisterTransactionBase & {
  /**
   * Should be always equal to `9` (Store in KVS transaction type)
   * @example 9
   */
  type: 9;
  asset: KVSTransactionAsset;
};

/** @example {"id":14674137414602658000,"height":31536741,"blockId":15921349202793791000,"type":2,"block_timestamp":166805152,"timestamp":166805152,"senderPublicKey":"a339974effc141f302bd3589c603bdc9468dd66bcc424b60025b36999eb69ca3","senderId":"U3031563782805250428","recipientId":null,"recipientPublicKey":null,"amount":0,"fee":300000000000,"relays":1,"signature":"1833a86e24d57ad6dbd30c47924500a03096fd06076fafe5bca4f23ab4629268f3b1a58a1ce275356bc0b79f64a11b8abe9bec6c3d55202d6393327f9278910b","signatures":[],"confirmations":427,"asset":{"delegate":{"username":"kpeo","publicKey":"a339974effc141f302bd3589c603bdc9468dd66bcc424b60025b36999eb69ca3","address":"U3031563782805250428"}}} */
export type RegisterDelegateTransaction = BaseTransaction & {
  /**
   * Always equal to `2`
   * @example 2
   */
  type: 2;
  /** There is no recipient for this type of transaction */
  recipientId?: string | null;
  /** There is no recipient for this type of transaction */
  recipientPublicKey?: string | null;
  asset: RegisterDelegateAsset;
};

/** @example {"id":9888167852341778000,"height":10488572,"blockId":16481510969712464000,"type":3,"block_timestamp":59782601,"timestamp":59782601,"senderPublicKey":"9560562121cdc41112a0b288101079346d9c67f5bbff1f4d5a29483258c9477a","senderId":"U9221911598904803004","recipientId":"U9221911598904803004","recipientPublicKey":"9560562121cdc41112a0b288101079346d9c67f5bbff1f4d5a29483258c9477a","amount":0,"fee":5000000000,"signature":"fe199a4a5790186c1c482c6f5c0de5b7baa0a66e4b97abcb96f47e197880ea8333dc57e1b497e32eabdb157ac834dbd85d58d7c550e8aabe208af79026279c04","signatures":[],"confirmations":745088,"asset":{"votes":["-c0c580c3fb89409f32181fef58935f286f0c1bbf61bd727084ed915b3a4bc95b"]},"votes":{"added":[],"deleted":["c0c580c3fb89409f32181fef58935f286f0c1bbf61bd727084ed915b3a4bc95b"]}} */
export type VoteForDelegateTransaction = BaseTransaction & {
  votes: {
    /** List of Upvoted delegates */
    added?: string[];
    /** List of Downvoted delegates */
    deleted?: string[];
  };
  /**
   * Always equal to `3`
   * @example 3
   */
  type: 3;
  asset: VoteForDelegateAsset;
};

export type AnyTransaction =
  | TokenTransferTransaction
  | RegisterDelegateTransaction
  | VoteForDelegateTransaction
  | ChatMessageTransaction
  | KVSTransaction;

export type RegisterTokenTransferTransaction = RegisterTransactionBase & {
  /** Can be `type 0 — Token transfer` or `type 8 — Chat/Message`. */
  type: 0 | 8;
  recipientId: string;
  /** Amount of token to transfer */
  amount: number;
};

export type RegisterAnyTransaction =
  | RegisterVoteForDelegateTransaction
  | RegisterTokenTransferTransaction
  | RegisterKVSTransaction
  | RegisterChatMessageTransaction
  | RegisterNewDelegateTransaction;
