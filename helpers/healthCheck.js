const request = require('request');
const _ = require('lodash');

module.exports = (nodes, log) => {
    if (typeof nodes === 'string') {
        return () => nodes;
    }
    this.hotNode = nodes[0];
    checkNodes(nodes, this, log);
    
    setInterval(() => {
        checkNodes(_.shuffle(nodes), this, log);
    }, 60000);

    return {
        node: () => {
            return this.hotNode;
        },
        changeNodes: _.throttle(() => {
            log.warn('[Health check]: Force change node!');
            checkNodes(_.shuffle(nodes), this, log);
        }, 5000)
    };
};

async function checkNodes(nodes, context, log) {
    let isFind = false;
    for (let n of nodes) {
        console.log('check', n);
        const res = await checkNode(n + '/api/peers/version');
        if (res) {
            isFind = true;
            context.hotNode = n;
            console.log('nice:', n);
        } else {
            console.log('Error check', n, !!res);
        }
    };
    if (!isFind && context.hotNode) {
        log.error('[Health check]: ALL nodes don`t ping! Pls check you internet connection!');
    }
    console.log('Finish');
}

function checkNode(url) {
    return new Promise(resolve => {
        request(url, (err, res, body) => {
            if (err) {
                resolve(false);
            } else if (res.statusCode === 200) {
                resolve(true);
            }
        });
    });
};
