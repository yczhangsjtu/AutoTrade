module.exports = {
  exchanges: {
    zb: {
      label: 'ZB',
      data_host: 'http://api.zb.cn',
      trade_host: 'https://trade.zb.cn'
    },
    okex: {
      label: 'OKEX',
      data_host: 'http://www.okex.com',
      trade_host: 'https://www.okex.com'
    }
  },
  https_key_file: 'key.pem',
  https_cert_file: 'cert.pem',
  real: false,
  timeout: 10000
};
