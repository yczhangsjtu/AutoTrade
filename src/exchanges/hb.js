function HBExchange(cred,message_box) {
	this.name = 'huobi';
	this.label = '[HBExchange]: ';
	this.errlabel = '[HBExchange]: (error) ';
	this.logger = new log.Logger(this.label,this.errlabel);
	this.depth = new Depth();
	this.storage = new Storage();
	this.verbose = 1;
	this.started = false;
	this.trades = {};
	this.orders = [];
	this.message_box = message_box;
	this.real = config.real;
	this.update_depth = true;
	this.update_storage = true;
	this.update_pending_trade = true;
	if(cred) {
		this.accesskey = cred.huobi_api_key;
		this.signer = new signer.HBSigner(cred.huobi_secret_key);
		this.account_id = cred.huobi_account;
	}
}

HBExchange.prototype.warn = function(content) {
	this.message_box.warn(content);
}

HBExchange.prototype.inform = function(content) {
	this.message_box.inform(content);
}

HBExchange.prototype.updateDepth = function(coinpair,cb) {
	var url = 'http://api.huobipro.com/market/depth?symbol='+this.coinpair_filter(coinpair)+'&type=step0';
	this.logger.vvlog("updating depth info for "+coinpair);
	this.logger.vvlog("  url is " + url);
	var me = this;
	request({
		uri: url,
		method: 'GET',
		timeout: 10000
	}, function(error, response, body) {
		if(error) {
			me.logger.vvlog(error.message);
			cb(false);
		} else {
			var info;
			try {
				info = JSON.parse(body);
			} catch(e) {
				me.logger.vvlog(e.message);
				cb(false);
				return;
			}
			if(info.status == "ok" && info.tick) {
				me.depth.update(coinpair,info.tick.asks,info.tick.bids);
				me.logger.vvlog("updated depth "+me.depth.str());
				cb(true);
			} else {
				me.logger.errlog("No asks or bids in returned data!");
				me.logger.errlog("Returned data is: "+body);
				cb(false);
			}
		}
	});
}

HBExchange.prototype.lookupAccountId = function(cb) {
	this.logger.vvlog("updating account id");
	var param={
		AccessKeyId: this.accesskey,
		SignatureMethod: "HmacSHA256",
		SignatureVersion: 2,
		Timestamp: util.getNowString(),
	};
	var path='/v1/account/accounts';
	var me = this;
	this.signer.sign('GET', path, param, function(sig,err) {
		if(err || !sig) {
			me.logger.errlog('Signer failed.');
			return;
		}
		var url = 'https://api.huobipro.com'+path+'?'+sig;
		me.logger.vvlog("requesting api.huobipro.com");
		me.logger.vvlog("  with url "+url);
		request({
			uri: url,
			method: 'GET',
			timeout: 10000
		}, function(error, response, body) {
			if(error) {
				me.logger.vvlog(error.message);
			} else {
				var info;
				try {
					me.logger.vvlog("Account id from huobi server: "+body);
					info = JSON.parse(body);
				} catch(e) {
					me.logger.vvlog(e.message);
					return;
				}
				if(info.status == 'ok' && info.data) {
					me.logger.log("Account ID");
					info.data.forEach(function(item) {
						console.log("id="+item.id+",type="+item.type+",state="+item.state+",userid="+item["user-id"]);
						if(item.type == "spot" && item.state == "working") {
							me.account_id = item.id;
						}
					});
				} else {
					me.logger.errlog(JSON.stringify(info));
				}
			}
		});
	});
}

HBExchange.prototype.updateStorage = function(cb) {
	if(!this.account_id) {
		this.logger.errlog("No account id in your credential file.");
		this.lookupAccountId();
		return;
	}
	this.logger.vvlog("updating account storage info");
	var param={
		AccessKeyId: this.accesskey,
		SignatureMethod: "HmacSHA256",
		SignatureVersion: 2,
		Timestamp: util.getNowString(),
	};
	var path='/v1/account/accounts/'+this.account_id+'/balance';
	this.logger.vvlog("signing " + param);
	var me = this;
	this.signer.sign('GET', path, param, function(sig,err) {
		if(err || !sig) {
			me.logger.errlog('Signer failed.');
			return;
		}
		var url = 'https://api.huobipro.com'+path+'?'+sig;
		me.logger.vvlog("requesting api.huobipro.com");
		me.logger.vvlog("  with url "+url);
		request({
			uri: url,
			method: 'GET',
			timeout: 10000
		}, function(error, response, body) {
			if(error) {
				me.logger.vvlog(error.message);
				cb(false);
			} else {
				var info;
				try {
					me.logger.vvlog("Account info from huobi server: "+body);
					info = JSON.parse(body);
				} catch(e) {
					me.logger.vvlog(e.message);
					cb(false);
					return;
				}
				if(info.status == 'ok' && info.data) {
					var res = {};
					var coins = info.data.list;
					for(var i in coins) {
						var coin = coins[i].currency;
						if(!res[coin]) res[coin] = {
							avail:0,
							freez:0,
						};
						if(coins[i].type == "trade")
							res[coin].avail = Number(coins[i].balance);
						else
							res[coin].freez = Number(coins[i].balance);
					}
					for(var coin in res) {
						var avail = res[coin].avail;
						var freez = res[coin].freez;
						me.logger.vvlog("updating storage of "+coin+" to ["+avail+","+freez+"]");
						var curr = me.storage.get(coin);
						me.storage.update(coin,avail,freez);
					}
					cb(true);
				} else {
					me.logger.errlog(JSON.stringify(info));
					cb(false);
				}
			}
		});
	});
}

HBExchange.prototype.coinpair_filter = function(coinpair) {
	var coins = coinpair.split('_');
	return coins[0].toLowerCase()+coins[1].toLowerCase();
}

HBExchange.prototype.updatePendingTrade = function(coinpair, cb) {
	if(!this.account_id) {
		this.logger.errlog("No account id in your credential file.");
		return;
	}
	this.logger.vvlog("updating pending trade info");
	var param={
		AccessKeyId: this.accesskey,
		SignatureMethod: "HmacSHA256",
		SignatureVersion: 2,
		Timestamp: util.getNowString(),
		symbol: this.coinpair_filter(coinpair),
		states: 'submitted,partial-filled',
	};
	var path='/v1/order/orders';
	this.logger.vvlog("signing " + param);
	var me = this;
	this.signer.sign('GET', path, param, function(sig,err) {
		if(err || !sig) {
			me.logger.errlog('Signer failed.');
			return;
		}
		var url = 'https://api.huobipro.com'+path+'?'+sig;
		me.logger.vvlog("requesting api.huobipro.com");
		me.logger.vvlog("  with url "+url);
		request({
			uri: url,
			method: 'GET',
			timeout: 10000
		}, function(error, response, body) {
			if(error) {
				me.logger.vvlog(error.message);
				cb(false);
			} else {
				var info;
				try {
					me.logger.vvlog("Pending order info from huobi server: "+body);
					info = JSON.parse(body);
				} catch(e) {
					me.logger.vvlog(e.message);
					cb(false);
					return;
				}
				if(info.status == "ok" && info.data) {
					me.orders = [];
					info.data.forEach(function(order,i){
						var type;
						if(order.type == "sell-limit") type = "sell";
						if(order.type == "buy-limit") type = "buy";
						me.orders.push({
							amount: order.amount,
							deal_amount: order['field-amount'],
							price: order.price,
							type: type,
						});
					});
					cb(true);
				} else {
					me.logger.errlog(JSON.stringify(info));
					cb(false);
				}
			}
		});
	});
}

HBExchange.prototype.trade = function(coinpair,price,amount,type,cb) {
	if(!this.account_id) {
		this.logger.errlog("No account id in your credential file.");
		return;
	}
	this.logger.vvlog("sending trade request");
	var param={
		AccessKeyId: this.accesskey,
		SignatureMethod: "HmacSHA256",
		SignatureVersion: 2,
		Timestamp: util.getNowString(),
		symbol: this.coinpair_filter(coinpair),
		price: price,
		amount: amount,
		type: type+"-limit",
	};
	param['account-id'] = this.account_id;
	var path='/v1/order/orders/place';
	this.logger.vvlog("signing " + param);
	var me = this;
	this.signer.sign('POST', path, param, function(sig,err) {
		if(err || !sig) {
			me.logger.errlog('Signer failed.');
			return;
		}
		var url = 'https://api.huobipro.com'+path+"?Signature="+sig;
		me.logger.vvlog("requesting api.huobipro.com");
		me.logger.vvlog("  with url "+url);
		me.logger.vvlog("  and parameter "+JSON.stringify(param));
		if(me.real) {
			request.post({
				url: url,
				form: param,
				timeout: 10000,
			}, function(error, response, body) {
				if(error) {
					me.logger.vvlog(error.message);
					cb();
				} else {
					var info;
					try {
						me.logger.vvlog("response of trade request from huobi server: "+body);
						info = JSON.parse(body);
					} catch(e) {
						me.logger.vvlog(e.message);
						cb();
						return;
					}
					result = info.status == "ok";
					if(result) {
						id = info.data;
						me.trades[id] = {
							id: id,
							coinpair: coinpair,
							price: price,
							amount: amount,
							type: type,
							time: new Date(),
						};
						me.logger.vlog("new trade recorded: "+JSON.stringify(me.trades[id]));
						me.inform("huobipro.com trade request succeeded\n"+
							"        " + type + " " + amount + " with price " + price + ",\n"+
							"        trade ID "+id);
						cb(me.trades[id]);
					} else {
						me.logger.errlog("trade request rejected");
						me.warn("huobipro.com trade request failed.");
						cb();
					}
				}
			});
		} else {
			me.logger.vlog("Not actually doing it!");
		}
	}, true); // onlysig = true
}

HBExchange.prototype.filter_amount = function(x,coinpair,price,type) {
	if(coinpair == "hsr_btc") {
		if(type == "sell") x = Math.min(x,this.storage.get('hsr').avail);
		if(type == "buy") x = Math.min(x,this.storage.get('btc').avail/price);
		x = Math.floor(x/0.0001)*0.0001;
	} else if(coinpair == "xrp_btc") {
		if(type == "sell") x = Math.min(x,this.storage.get('xrp').avail);
		if(type == "buy") x = Math.min(x,this.storage.get('btc').avail/price);
		x = Math.floor(x);
	} else if(coinpair == "eos_btc") {
		if(type == "sell") x = Math.min(x,this.storage.get('eos').avail);
		if(type == "buy") x = Math.min(x,this.storage.get('btc').avail/price);
		x = Math.floor(x/0.01)*0.01;
	} else if(coinpair == "qtum_btc") {
		if(type == "sell") x = Math.min(x,this.storage.get('qtum').avail);
		if(type == "buy") x = Math.min(x,this.storage.get('btc').avail/price);
		x = Math.floor(x/0.0001)*0.0001;
	} else if(coinpair == "btc_usdt") {
		if(type == "sell") x = Math.min(x,this.storage.get('btc').avail);
		if(type == "buy") x = Math.min(x,this.storage.get('usdt').avail/price);
		x = Math.floor(x/0.0001)*0.0001;
	}
	return x;
}


