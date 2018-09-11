var request = require('request');
var moment = require('moment');
var util = require('util');

function getNowString() {
  return moment().local().format('YYYY-MM-DD HH:mm:ss');
}

function getDateString(date) {
  return moment(date).local().format('YYYY-MM-DD HH:mm:ss');
}

function getDate(timestamp) {
  return moment(timestamp*1000).toDate();
}

function getNow() {
  return moment().toDate();
}

function getNowSecond() {
  return (new Date()).getTime();
}

function format() {
  return util.format(...arguments);
}

function requestProcessJSON(req, process, cb, ecb) {
  request(req, function(error, response, body) {
    try {
      if(error) throw error;
      var data = JSON.parse(body);
      process(data);
      cb(response, body);
    } catch(e) {
      ecb(e, body);
    }
  });
}
