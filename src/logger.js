var winston = require('winston');

function getWinstonLogger(name) {
  var logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
      new winston.transports.File({filename: './log/'+name+'.log', level: 'error'}),
      new winston.transports.File({filename: './log/combined.log'}),
    ]
  });
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.simple()
    }));
  }
  return logger;
}

module.exports = getWinstonLogger;
