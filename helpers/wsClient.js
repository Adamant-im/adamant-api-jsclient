const ioClient = require("socket.io-client");
const _ = require('lodash');
const logger = require('./logger');

module.exports = {
    isSocketEnabled: false, // If we need socket connection
    wsType: "ws", // Socket connection type, "ws" (default) or "wss"
    admAddress: '', // ADM address to subscribe to notifications
    connection: null, // Socket connection
    onNewMessage: null, // Method to process new messages or transactions
    activeNodes: [], // List of nodes that are active. Not all of them synced and support socket.
    activeSocketNodes: [], // List of nodes that are active, synced and support socket
    useFastest: false, // If to connect to node with minimum ping. Not recommended.

    // Constructor
    initSocket(params) {
        this.onNewMessage = params.onNewMessage;
        this.isSocketEnabled = params.socket;
        this.wsType = params.wsType;
        this.admAddress = params.admAddress;
    },

    // Runs after every healthCheck() to re-connect socket if needed
    reviseConnection(nodes) {
        if (!this.isSocketEnabled) {
            return;            
        }
        if (!this.connection || !this.connection.connected) {
            this.activeNodes = nodes.slice();
            this.setNodes();
            this.setConnection();
        }
    },

    // Make socket connection and subscribe to new transactions
    setConnection() {
        if (this.activeSocketNodes.length === 0) {
            logger.warn(`[Socket] No supported socket nodes at the moment.`);
            return;            
        }

        const node = this.socketAddress();
        logger.log(`[Socket] Supported nodes: ${this.activeSocketNodes.length}. Connecting to ${node}...`);
        this.connection = ioClient.connect(node, { reconnection: false, timeout: 5000 });

        this.connection.on('connect', () => {
            this.connection.emit('address', this.admAddress);
            logger.info('[Socket] Connected to ' + node + ' and subscribed to incoming transactions for ' + this.admAddress + '.');
        });
        
        this.connection.on('disconnect', reason => {
            logger.warn('[Socket] Disconnected. Reason: ' + reason)
        });
        
        this.connection.on('connect_error', (err) => {
            logger.warn('[Socket] Connection error: ' + err)
        });
    
        this.connection.on('newTrans', transaction => {
            if ((transaction.recipientId === this.admAddress) && (transaction.type === 0 || transaction.type === 8)) {
                // console.info(`[Socket] New incoming socket transaction received: ${transaction.id}`);
                this.onNewMessage(transaction);
            }
        });
    },

    // Save the list of nodes activeSocketNodes that are active, synced and support socket
    setNodes() {
        this.activeSocketNodes = this.activeNodes.filter(n => n.socketSupport & !n.outOfSync);
        // Remove nodes without IP if "ws" connection type
        if (this.wsType === "ws") { 
            this.activeSocketNodes = this.activeSocketNodes.filter(n => !n.ifHttps || n.ip); 
        }
    },

    // Returns socket url for connection
    socketAddress() {
        const node = this.useFastest ? this.fastestNode() : this.randomNode();
        let socketUrl = this.wsType + "://";
        if (this.wsType === "ws") {
            let host = node.ip;
            if (!host || host === undefined)
            	host = node.url;
            socketUrl = socketUrl + host + ":" + node.wsPort
	    } else {
            socketUrl = socketUrl + node.url; // no port if wss
        }
        return socketUrl;
    },
    
    fastestNode() {
        return this.activeSocketNodes[0]; // They are sorted by ping
    },
    
    randomNode() {
        return this.activeSocketNodes[_.random(this.activeSocketNodes.length - 1)]
    }
    
}
