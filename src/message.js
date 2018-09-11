const util = require('./util.js');

function Message(level, label, content) {
	this.level = level;
  this.label = label;
	this.content = content;
	this.time = util.getNow();
}

function MessageBox() {
	this.messages = [];
}

MessageBox.prototype.add = function(msg) {
	this.messages.push(msg);
}

MessageBox.prototype.warn = function(label, msg) {
	this.add(new Message("warn", msg));
}

MessageBox.prototype.error = function(label, msg) {
	this.add(new Message("error", msg));
}

MessageBox.prototype.info = function(label, msg) {
	this.add(new Message("info", msg));
}

MessageBox.prototype.clear = function() {
	this.messages = [];
}

module.exports = {
	MessageBox: MessageBox,
	newInfo: function(label, content) {
		return new Message("info", label, content);
	},
	newWarn: function(label, content) {
		return new Message("warn", label, content);
	},
	newError: function(label, content) {
		return new Message("error", label, content);
	},
};
