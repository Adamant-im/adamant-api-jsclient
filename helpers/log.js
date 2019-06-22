let fs = require('fs');

if (!fs.existsSync('./logs')) {
	fs.mkdirSync('./logs');
}

let infoStr = fs.createWriteStream('./logs/' + date() + '.log', {
	flags: "a"
});


infoStr.write(`
__________________________________Start ${new Date().toString()}__________________________________

`);

module.exports = {
	error(str) {
		infoStr.write(`
		` + 'error [ADM API]|' + time() + '|' + str);
		console.log('\x1b[31m', 'error|' + time(), "\x1b[0m", str);
	},
	info(str) {
		console.log('\x1b[32m', 'info|' + time(), "\x1b[0m", str);
		
		infoStr.write(`
		` + 'info [ADM API]|' + time() + '|' + str);
	},
	warn(str) {
		console.log('\x1b[33m', 'warn|' + time(), "\x1b[0m", str);
		
		infoStr.write(`
		` + 'warn [ADM API]|' + time() + '|' + str);
	},
}

function time() {
	var options = {
		hour: 'numeric',
		minute: 'numeric',
		second: 'numeric'
	};
	
	return new Date().toLocaleString("en", options);
}

function date() {
	var options = {
		day: 'numeric',
		month: 'numeric',
		year: 'numeric'
	};
	
	return (new Date().toLocaleString("ru", options)).replace(/\//g, '_');
}