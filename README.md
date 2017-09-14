Microcore.js
=========================

[![npm](https://img.shields.io/npm/v/microcore.svg)](https://www.npmjs.com/package/microcore)
[![MIT](https://img.shields.io/npm/l/microcore.svg)](http://opensource.org/licenses/MIT)
[![Build Status](https://travis-ci.org/yamalight/microcore.svg?branch=master)](https://travis-ci.org/yamalight/microcore)
[![bitHound Overall Score](https://www.bithound.io/github/yamalight/microcore/badges/score.svg)](https://www.bithound.io/github/yamalight/microcore)
[![Coverage Status](https://coveralls.io/repos/github/yamalight/microcore/badge.svg?branch=master)](https://coveralls.io/github/yamalight/microcore?branch=master)

Microcore.js is a library for simple creation of pipelinening microservices in Node.js with RabbitMQ.

# Installation
```sh
npm install --save microcore
```

# Requirements

Since Microcore.js is written in ES6 and it uses async/await - it requires latest stable node (7.x or later).

# Features

* Simple interface for building pipelinening (micro)services
* Easy way to scale services both horizontally (by adding more nodes) and vertically (by adding more subscribers)

# Usage

## Quick start

Example service that subscribe to messages from `helloworld` topic and does some work with incoming data (in this case it just appends ` world!` to incoming string):
```js
const createService = require('microcore');

// service config
const serviceConfig = {
  ID: 'helloworld',
  type: 'servicetype',
  rabbit: {host: 'rabbit', exchange: 'exchange'},
  statusReportInterval: 60000,
  resultKey: 'responsekey',
};

// creating service will return shutdown function
const shutdown = await createService({
  config: serviceConfig,
  onInit() {
    // triggered on service init
    console.log('Hello world service started!');
  },
  onJob(data, done) {
    // triggered on incoming data to process.
    // do your work here..
    const resultData = `${data} world!`;
    // call `done(err, result)` after doing the work with data
    // result will be sent to `resultKey`
    done(err, resultData);
    // alternatively you can specify responseKey, e.g.:
    // done(err, resultData, responseKey);
  },
  onCleanup() {
    // triggered before service cleanup
    console.log('Hello world service stopping!');
  },
});
```

Example service that sends messages to `helloworld` and logs response to console:
```js
const Microwork = require('microwork');

// create master
const master = new Microwork({host: 'rabbit', exchange: 'exchange'});
// listen for reply from workers
await master.subscribe('responsekey', (msg) => {
  console.log(msg); // -> "hello world!"
});
// send message to workers
await master.send('helloworld', 'hello');
```

## License

[MIT](http://www.opensource.org/licenses/mit-license)
