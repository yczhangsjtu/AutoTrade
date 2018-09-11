const util = require('./util.js');

function lowask(asks) {
	var minprice = -1, minindex = -1;
	asks.forEach(function(ask,i) {
		if(minprice < 0 || ask[0] < minprice) {
			minprice = ask[0];
			minindex = i;
		}
	});
	if(minindex >= 0) return asks[minindex];
}

function highbid(bids) {
	var maxprice = 0, maxindex = -1;
	bids.forEach(function(bid,i) {
		if(bid[0] > maxprice) {
			maxprice = bid[0];
			maxindex = i;
		}
	});
	if(maxindex >= 0) return bids[maxindex];
}

function accumulateDepth(asks,bids,maxdepth) {
	asks.sort(function(a,b) {
		return a[0]-b[0];
	});
	bids.sort(function(a,b) {
		return b[0]-a[0];
	});
	var depths = [asks,bids];
	var indices = [0,0];
	var amounts = [0,0];
	var over = [false,false];
	var curr = 0;
	var data = [];
	while(curr <= maxdepth) {
		var left = [0,0];
		var minleft = -1;
		var allover = true;
		var next = [undefined,undefined,curr];
		for(var i = 0; i < 2; i++) {
			if(over[i]) continue;
			var k = indices[i];
			if(k >= depths[i].length) {
				over[i] = true;
				continue;
			}
			allover = false;
			next[i] = depths[i][k][0];
			left[i] = depths[i][k][1] - amounts[i];
			if(minleft < 0 || minleft > left[i])
				minleft = left[i];
		}
		if(allover) break;
		data.push(next);
		if(curr == maxdepth) break;

		if(curr + minleft > maxdepth) {
			minleft = maxdepth - curr;
			curr = maxdepth;
		} else {
			curr += minleft;
		}
		for(var i = 0; i < 2; i++) {
			if(over[i]) continue;
			amounts[i] += minleft;
			if(amounts[i] >= depths[i][indices[i]][1]) {
				indices[i]++;
				amounts[i] = 0;
			}
		}
	}
	return data;
}

function findUpsideDown(coinpair,depths,maxmins,recommend) {
	var ret = [];
	if(!maxmins[coinpair])
		return [];
	if(maxmins[coinpair].time < util.getNow()-2000)
		return [];
	var prices = [];
	var data = maxmins[coinpair].data;
	for(var ex in data) {
		var maxmin = data[ex];
		prices.push({ex:ex,maxmin:maxmin});
	}
	for(var i = 0; i < prices.length; i++) {
		for(var j = 0; j < prices.length; j++) {
			if(i == j) continue;
			if(prices[i].maxmin.buy.price > prices[j].maxmin.sell.price * 1.002) {
				var amount = Math.min(prices[i].maxmin.buy.amount,prices[j].maxmin.sell.amount);
				var ramount = recommend(amount,prices[i].ex,prices[j].ex,prices[i].maxmin.buy.price,prices[j].maxmin.sell.price);
				var profit = amount*(prices[i].maxmin.buy.price-prices[j].maxmin.sell.price);
				var ratio = (prices[i].maxmin.buy.price-prices[j].maxmin.sell.price)/prices[j].maxmin.sell.price;
				ret.push({
					ex1:prices[i].ex,ex2:prices[j].ex,
					price1:prices[i].maxmin.buy.price,price2:prices[j].maxmin.sell.price,
					ratio:ratio,amount:amount,profit:profit,
					ramount:ramount});
			}
		}
	}
	return ret;
}

function bestUpsideDown(upside_down_info) {
	var max = 0;
	var ret;
	upside_down_info.forEach(function(upside_down) {
		if(upside_down.ramount > 0) {
			if(upside_down.ratio > max) {
				max = upside_down.ratio;
				ret = upside_down;
			}
		}
	});
	return ret;
}

function findMaxminPrice(asks,bids) {
	var ask = lowask(asks);
	var bid = highbid(bids);
	return {
			sell: {price:ask[0],amount:ask[1]},
			buy:  {price:bid[0],amount:bid[1]},
	};
}

module.exports = {
	lowask: lowask,
	highbid: highbid,
	accumulateDepth: accumulateDepth,
	findUpsideDown: findUpsideDown,
	bestUpsideDown: bestUpsideDown,
	findMaxminPrice: findMaxminPrice,
}
