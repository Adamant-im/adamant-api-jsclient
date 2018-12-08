const request = require('request');

module.exports = (nodes) => {
	if (typeof nodes === 'string')
	return ()=>nodes;
	
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
		.get(n+'/api/delegates/get')
		.on('response', function(response) {
			if (response.statusCode===200) context.hotNode=n;
		});
	});
}