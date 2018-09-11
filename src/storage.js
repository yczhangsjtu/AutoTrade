function Storage() {
	this.data = {};
}

Storage.prototype.update = function(coin, avail, freez) {
	this.data[coin] = {
		avail: avail,
		freez: freez
	};
}

Storage.prototype.get = function(coin) {
	var p = this.data[coin];
	if(p) return p;
	return {avail: 0, freez: 0};
}

module.exports = Storage;
