const crypto = require('crypto');

function ZBSigner(key) {
	this.key = key;
	var sha = crypto.createHash('sha1');
	sha.update(key);
	var keydg = Buffer.from(sha.digest('hex'));
	this.k_ipad = Buffer.alloc(64);
	this.k_opad = Buffer.alloc(64);
	keydg.copy(this.k_ipad);
	keydg.copy(this.k_opad);
	for(var i = 0; i < 64; i++) {
		this.k_ipad[i] = this.k_ipad[i]^54;
		this.k_opad[i] = this.k_opad[i]^92;
	}
}

ZBSigner.prototype.sign = function(data) {
	var md5 = crypto.createHash('md5');
	md5.update(this.k_ipad);
	md5.update(data);
	var k = md5.digest();
	md5 = crypto.createHash('md5');
	md5.update(this.k_opad);
	md5.update(k.slice(0,16));
	return md5.digest('hex');
}

function OKSigner(key) {
	this.key = key;
}

OKSigner.prototype.sign = function(data) {
	var hash = crypto.createHash('md5');
	hash.update(data+'&secret_key='+this.key);
	return hash.digest('hex').toUpperCase();
}

function HBSigner(key) {
	this.key = key;
}

HBSigner.prototype.sign = function(method, path, data, onlysig) {
	var hmac = crypto.createHmac('sha256',this.key);
	var pars = [];
	for (var item in data) {
		pars.push(item + "=" + encodeURIComponent(data[item]));
	}
	var p = pars.sort().join("&");
	hmac.update(method+'\n');
	hmac.update('api.huobipro.com\n');
	hmac.update(path+'\n');
	hmac.update(p);
	var sig = encodeURIComponent(hmac.digest('base64'));
	if(onlysig) {
		return sig;
	} else {
    return p+'&Signature='+sig;
  }
}

module.exports = {
	ZBSigner: ZBSigner,
	OKSigner: OKSigner,
	HBSigner: HBSigner
}
