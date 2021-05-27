module.exports = {

	epochTime: new Date(Date.UTC(2017, 8, 2, 17, 0, 0, 0)),
	fees: {
		send: 50000000,
		vote: 1000000000,
		secondsignature: 500000000,
		delegate: 30000000000,
		multisignature: 500000000,
		dapp: 2500000000,
		old_chat_message: 500000,
		chat_message: 100000,
		profile_update: 5000000,
		avatar_upload: 10000000,
		state_store: 100000
	},
	transactionTypes: {
		SEND: 0,
		SIGNATURE: 1,
		DELEGATE: 2,
		VOTE: 3,
		MULTI: 4,
		DAPP: 5,
		IN_TRANSFER: 6,
		OUT_TRANSFER: 7,
		CHAT_MESSAGE: 8,
		STATE: 9
	},
	maxVotesPerTransaction: 33,
	SAT: 100000000,
	RE_HEX: /^[a-fA-F0-9]+$/,
	RE_BASE64: /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/,
	RE_ADM_ADDRESS: /^U([0-9]{6,})$/,
	RE_BTC_ADDRESS: /^(bc1|[13])[a-km-zA-HJ-NP-Z02-9]{25,39}$/,
	RE_DASH_ADDRESS: /^[7X][1-9A-HJ-NP-Za-km-z]{33,}$/,
	RE_DOGE_ADDRESS: /^[A|D|9][A-Z0-9]([0-9a-zA-Z]{9,})$/,
	RE_LSK_ADDRESS: /^[0-9]{2,21}L$/
	
}
