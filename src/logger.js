var { createLogger, format, transports } = require('winston');

const { combine, timestamp, label, printf } = format;

const myFormat = printf(info => {
  return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
});

function getWinstonLogger(name) {
  var logger = createLogger({
    level: 'info',
    format: combine(
      timestamp(),
      myFormat
    ),
    transports: [
      new transports.File({filename: './log/'+name+'.log', level: 'debug'}),
      new transports.File({filename: './log/combined.log'}),
    ]
  });
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
      format: format.simple()
    }));
  }
  return logger;
}

module.exports = getWinstonLogger;
