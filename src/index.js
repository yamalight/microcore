// npm packages
const Microwork = require('microwork');
const serializeError = require('serialize-error');

// our packages
const StatusPlugin = require('./status');
const logger = require('./logger');

// noop dummy function
const noop = () => {};

// RabbitMQ default configs
const queueConfig = {durable: true, autoDelete: false};
const sendConfig = {persistent: true};
const subscribeConfig = {ack: false};

// core function that creates service
const createService = async ({config, onInit = noop, onJob = noop, onCleanup = noop} = {}) => {
  logger.debug('Creating service with config:', config);

  // config is mandatory
  if (!config) {
    throw new Error('No config specified!');
  }

  // create queue
  const mwConfig = Object.assign(config.rabbit, {
    defaultQueueConfig: queueConfig,
    defaultSendConfig: sendConfig,
    defaultSubscribeConfig: subscribeConfig,
  });
  const service = new Microwork(mwConfig);

  // wait for connection to rabbit
  await service.connect();

  // init the results queue
  await service.channel.assertQueue(`microwork-${config.resultKey}-queue`, queueConfig);

  // start reporting self status
  service.registerPlugin(StatusPlugin);
  service.statusReportInterval = config.statusReportInterval || service.statusReportInterval;
  service.autoreportStatus(config);
  logger.debug('Initialized status report..');

  // process queue
  await service.subscribe(config.ID, (job, reply, ack) => {
    // create service done function
    const serviceDone = (err, data, responseKey) => {
      // acknowledge that message was processed
      ack();

      // if has error - pass it to queue
      if (err) {
        reply('microcore.error', {error: serializeError(err), source: config.ID, data});
        return;
      }

      // if no data - just finish
      if (!data) {
        return;
      }

      // add to update queue
      reply(responseKey || config.resultKey, data, sendConfig);
    };

    // trigger callback
    onJob(job, serviceDone);
  });

  // trigger init after returning
  onInit();
  logger.debug('Init done!');

  // return cleanup function
  return async () => {
    onCleanup();
    await service.stopAutoreportStatus();
    await service.stop();
  };
};

module.exports = createService;
