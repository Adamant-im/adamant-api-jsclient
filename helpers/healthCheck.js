const request = require('request');

module.exports = (nodes) => {
	if (typeof nodes === 'string')
	return ()=>nodes;
	
	this.hotNode = nodes[0];
	checkNodes(nodes, this);
	
	setInterval(()=>{
		checkNodes(nodes, this)
	},60000);
	
	return ()=>{
		return this.hotNode;
	}
}

function checkNodes(nodes, context){
	nodes.forEach(n=>{
		let result= false;
		request
		.get(n+'/api/peers/version')
		.on('response', function(response) {
			if (response.statusCode===200) context.hotNode=n;
		});
	});
}