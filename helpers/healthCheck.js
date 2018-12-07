const request = require('request');

module.exports = (nodes) => {
	if (typeof nodes === 'string')
	nodes = [nodes];
	
	checkNodes(nodes, this);
	
	setInterval(()=>{
		checkNodes(nodes, this)
	},10000);
	
	return ()=>{
		return this.hotNode;
	}	
}

function checkNodes(nodes, context){
	nodes.forEach(n=>{
		let result= false;
		request
		.get(n)
		.on('response', function(response) {
			console.log(n, response.statusCode)
			if (response.statusCode===200) context.hotNode=n;
		});
	});
}




// let t=module.exports(['https://ya.ru', 'http://swbot.info']);

// setInterval(()=>{
// console.log(t());
// },2000);
