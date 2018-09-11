const request = require('request');

const config = require('../../config.js');
const signer = require('./signer.js');
const Depth = require('./depth.js');
const Storage = require('./storage.js');
const util = require('../util.js');
const logger = require('./logger.js')('exchange');
const message = require('../message.js');

function Exchange(cred, messageBox) {
  this.name = 'unknown exchange';
  this.label = 'Unknown exchange';
	this.logger = logger;
	this.depth = new Depth();
	this.storage = new Storage();
	this.started = false;
	this.real = config.real;
	this.doUpdateDepth = true;
	this.doUpdateStorage = true;
	this.doUpdatePendingTrade = true;
	this.trades = {};
	this.orders = [];
  this.messageBox = messageBox;
}

Exchange.prototype.error = function(content) {
  this.messageBox.error(this.label, content);
}

Exchange.prototype.warn = function(content) {
  this.messageBox.warn(this.label, content);
}

Exchange.prototype.info = function(content) {
  this.messageBox.info(this.label, content);
}

Exchange.prototype.callAPI = function(prepare, process, cb, ecb) {
  var req = prepare();
  this.logger.debug("Requesting URL: " + req.uri);
  if(req.method == 'POST') {
    this.logger.debug("  Body is " + JSON.stringify(req.body));
  }
  req.timeout = config.timeout;
  util.requestProcessJSON(req, process, cb, ecb);
}

Exchange.prototype.updateDepth = function(coinpair, cb, ecb) {
  var me = this;
  this.logger.debug("Updating depth info");
  this.callAPI(function () {
    return me.prepareDepthRequest(coinpair);
  }, function(data) {
    me.processDepthData(coinpair, data);
  }, cb, ecb);
}

Exchange.prototype.updateStorage = function(cb, ecb) {
  this.logger.debug("Updating account storage info");
  this.callAPI(this.prepareStorageRequest, this.processStorageData, cb, ecb);
}

Exchange.prototype.updatePendingTrade = function(coinpair, cb, ecb) {
  var me = this;
  this.logger.debug("Updating pending trade info");
  this.callAPI(function () {
    return me.preparePendingTradeRequest(coinpair);
  }, function(data) {
    me.processPendingTradeData(coinpair, data);
  }, cb, ecb);
}

Exchange.prototype.trade = function(coinpair, price, amount, type, cb, ecb) {
  var me = this;
  this.logger.debug("Updating pending trade info");
  if(!this.real) {
    this.logger.info("Not really going to trade!");
    cb(null, "Not actually traded");
    return;
  }
  this.callAPI(function () {
    return me.prepareTradeRequest(coinpair, price, amount, type);
  }, function(data) {
    me.processTradeData(coinpair, price, amount, type, data);
  }, cb, ecb);
}

module.exports = Exchange;
