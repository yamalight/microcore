// npm packages
const test = require('tap');
const Microwork = require('microwork');

// our packages
const createService = require('../index');

// redis config
const rabbitHost = process.env.RABBIT_HOST || 'localhost';
const rabbitConfig = {host: rabbitHost, exchange: 'test'};
const queueConfig = {durable: true, autoDelete: false};

// tests
test.test('Microcore', it => {
  let client;

  // create new client
  it.test('Prepare', t => {
    client = new Microwork(rabbitConfig);
    const waitForInit = async () => {
      await client.connect();
      t.end();
    };
    waitForInit();
  });

  // tests
  it.test('# should throw an error without config', t =>
    createService().catch(e => {
      t.match(e, /No config specified!/);
      t.end();
    })
  );

  it.test('# should create and init simple service', t => {
    const serviceId = 'testservice';
    const serviceType = 'testprocessor';
    const serviceConfig = {
      ID: serviceId,
      type: serviceType,
      rabbit: rabbitConfig,
      statusReportInterval: 500,
      resultKey: 'test',
    };
    const run = async () => {
      const shutdown = await createService({
        config: serviceConfig,
        onInit() {
          t.ok(true);
        },
      });

      // wait for rabbitmq status to update
      const tag = await client.subscribe('microcore.service', async config => {
        // shutdown service
        await shutdown();
        await client.unsubscribe('microcore.service', tag);
        // compare
        t.deepEqual(config, serviceConfig, 'Service has right config');
        t.end();
      });
    };
    run();
  });

  it.test('# should create and handle simple job', t => {
    // test data
    const serviceId = 'workservice';
    const serviceType = 'workprocessor';
    const resultKey = 'result';
    const testData = {a: 1, b: 2};

    const run = async () => {
      // create new service
      const shutdown = await createService({
        config: {
          ID: serviceId,
          type: serviceType,
          rabbit: rabbitConfig,
          statusReportInterval: 30000,
          resultKey,
        },
        onInit() {
          t.ok(true);
        },
        onJob(data, done) {
          // get incoming data
          t.deepEqual(data, testData, 'Correct data payload');
          const result = Object.assign(data, {done: true});
          done(null, result);
        },
      });

      // listen for results
      const tag = await client.subscribe(
        resultKey,
        async data => {
          // cleanup
          await shutdown();
          await client.unsubscribe(resultKey, tag);
          // check
          t.true(data.done);
          t.end(0);
        },
        queueConfig
      );

      // send data
      await client.send(serviceId, testData, {persistent: true});
    };
    run();
  });

  it.test('# should reply to custom given response key', t => {
    // test data
    const serviceId = 'workservice';
    const serviceType = 'workprocessor';
    const resultKey = 'result';
    const responseKey = 'response';
    const testData = {a: 1, b: 2, responseKey};

    const run = async () => {
      // create new service
      const shutdown = await createService({
        config: {
          ID: serviceId,
          type: serviceType,
          rabbit: rabbitConfig,
          statusReportInterval: 30000,
          resultKey,
        },
        onInit() {
          t.ok(true);
        },
        onJob(data, done) {
          // get incoming data
          t.deepEqual(data, testData, 'Correct data payload');
          const result = Object.assign(data, {done: true});
          done(null, result, data.responseKey);
        },
      });

      // listen for results
      const brokenTag = await client.subscribe(resultKey, () => t.fail());
      const tag = await client.subscribe(
        responseKey,
        async data => {
          // cleanup
          await shutdown();
          await client.unsubscribe(responseKey, tag);
          await client.unsubscribe(resultKey, brokenTag);
          // check
          t.true(data.done);
          t.end(0);
        },
        queueConfig
      );

      // send data
      await client.send(serviceId, testData, {persistent: true});
    };
    run();
  });

  it.test('# should send error to microcore.error topic', t => {
    // test data
    const serviceId = 'workservice';
    const serviceType = 'workprocessor';
    const resultKey = 'result';
    const testData = {a: 1, b: 2};

    const run = async () => {
      // create new service
      const shutdown = await createService({
        config: {
          ID: serviceId,
          type: serviceType,
          rabbit: rabbitConfig,
          statusReportInterval: 30000,
          resultKey,
        },
        onInit() {
          t.ok(true);
        },
        onJob(data, done) {
          t.deepEqual(data, testData, 'Correct data payload');
          done(new Error('test error'));
        },
      });

      // listen for results
      const brokenTag = await client.subscribe(resultKey, () => t.fail());
      const tag = await client.subscribe(
        'microcore.error',
        async data => {
          // cleanup
          await shutdown();
          await client.unsubscribe('microcore.error', tag);
          await client.unsubscribe(resultKey, brokenTag);
          // check
          t.ok(data.error);
          t.equal(data.error.name, 'Error', 'Correct error name');
          t.equal(data.error.message, 'test error', 'Correct error message');
          t.end(0);
        },
        queueConfig
      );

      // send data
      await client.send(serviceId, testData, {persistent: true});
    };
    run();
  });

  it.test('Should trigger addition cleanup', t => {
    // test data
    const serviceId = 'workservice';
    const serviceType = 'workprocessor';
    const resultKey = 'result';

    const run = async () => {
      // create new service
      const shutdown = await createService({
        config: {
          ID: serviceId,
          type: serviceType,
          rabbit: rabbitConfig,
          statusReportInterval: 30000,
          resultKey,
        },
        onInit() {
          t.ok(true);
        },
        onCleanup() {
          t.end();
        },
      });

      // wait a bit
      await new Promise(r => setTimeout(r, 100));

      // trigger shutdown
      shutdown();
    };
    run();
  });

  // after all done - close rabbit client
  it.test('Cleanup', t => {
    client.stop();
    t.end();
  });

  it.end();
});
