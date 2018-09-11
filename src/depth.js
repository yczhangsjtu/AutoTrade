const config = require('../config.js');
const strategy = require('./strategy.js');
const util = require('./util.js');

function Depth() {
	this.data = {};
	this.time = 0;
}

Depth.prototype.update = function(coinpair, asks, bids, timestamp) {
	if(!this.data[coinpair]) {
		this.data[coinpair] = {
			asks: [],
			bids: [],
		};
	}
	this.data[coinpair].asks = asks;
	this.data[coinpair].bids = bids;
	this.data[coinpair].depth = strategy.accumulateDepth(asks,bids,config.maxdepth[coinpair]);
	this.data[coinpair].maxmin = strategy.findMaxminPrice(asks,bids);
	this.time = util.getNow();
  if(timestamp) {
    this.time = util.getDate(timestamp);
  }
}

Depth.prototype.asks = function(coinpair) {
	if(this.data[coinpair])
		return this.data[coinpair].asks;
}

Depth.prototype.bids = function(coinpair) {
	if(this.data[coinpair])
		return this.data[coinpair].bids;
}

Depth.prototype.str = function() {
	return JSON.stringify(this.data);
}

module.exports = Depth;
