const crypto = require('crypto');
const prompt = require('prompt');
const fs = require('fs');
var credential = require('./credential.js');

prompt.start();

var cleartext, ciphertext;

/* Cleartext Template:
module.exports = {
	encrypted: false,
	data: JSON.stringify({
    keys: {
      zb: {
        access_key: '',
        secret_key: ''
      },
      okex: {
        access_key: '',
        secret_key: ''
      },
      binance: {
        access_key: '',
        secret_key: ''
      }
    },
		username:       'username',
		password:       'password',
		email_username: '123456789@qq.com',
		email_password: 'qqpassword',
		tomail:         'blabla@foo.com',
		mail_host:      'smtp.qq.com',
		mail_port:      465,
	}),
}
*/

if(credential.encrypted)
	ciphertext = credential.data;
else
	cleartext = JSON.parse(credential.data);

schema = {
	properties: {
		passphrase: {
			message: "Enter the passphrase",
			hidden: true,
		},
	},
};

schema2 = {
	properties: {
		passphrase: {
			message: "Repeat the passphrase",
			hidden: true,
		},
	},
};

module.exports = function(cb) {
	if(cleartext) {
		console.log("This is the first time you open the program.");
		console.log("The credentials need to be encrypted.");
		console.log("Please input the passphrase for encrypting the credentials:");
		prompt.get(schema,function(err,result){
			if(err) {
				console.log("Error getting passphrase!");
				return;
			}
			prompt.get(schema2,function(err,result2){
				if(err) {
					console.log("Error getting passphrase!");
					return;
				}
				if(result.passphrase != result2.passphrase) {
					console.log("Passphrases does not match!");
					return;
				}
				var pass = result.passphrase;
				var cipher = crypto.createCipher('aes256',pass);
				ciphertext = cipher.update(JSON.stringify(cleartext),'utf8','hex');
				ciphertext += cipher.final('hex');
				fs.writeFileSync(__dirname+'/credential.js',
					'module.exports = {\n'+
					'  encrypted: true,\n'+
					'  data: \''+ciphertext+'\',\n}');
				console.log('Saved the encrypted information. Exiting...');
			});
		});
	} else if(ciphertext) {
		prompt.get(schema,function(err,result){
			if(err) {
				console.log("Error getting passphrase!");
				return;
			}
			var cred;
			try {
				var pass = result.passphrase;
				var decipher = crypto.createDecipher('aes256',pass);
				cleartext = decipher.update(ciphertext,'hex','utf8');
				cleartext += decipher.final('utf8');
				cred = JSON.parse(cleartext);
			} catch(e) {
				console.log("Error in parsing deciphered credentials.");
				console.log(e.message);
				return;
			}
			cb(cred);
		});
	} else {
		console.log("No ciphertext or cleartext!");
	}
}
