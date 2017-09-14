// npm packages
const winston = require('winston');

let level = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
if (process.env.NODE_ENV === 'test') {
  level = 'error';
}

// create new logger
const logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level,
      colorize: true,
      timestamp: true,
      prettyPrint: true,
      label: 'microcore',
    }),
  ],
});

module.exports = logger;
