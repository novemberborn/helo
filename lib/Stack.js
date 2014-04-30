'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var BaseRequest = require('./_BaseRequest');
var RequestHandler = require('./_RequestHandler');
var chunkifyForm = require('./_chunkifyForm');
var chunkifyJson = require('./_chunkifyJson');
var warrantPromise = require('./_warrantPromise');

var hop = {}.hasOwnProperty;

// # Stack

// Creates a request handling stack. [Emits events](../doc/Events.md.html)
// related to the request lifecycle.

// ## Stack()

// Can be called without `new`.
function Stack() {
  if (!(this instanceof Stack)) {
    return new Stack();
  }

  EventEmitter.call(this);

  // ## Stack#Request(incomingMessage)

  // Wraps an incoming message in a Helo request. Each stack instance has its
  // own constructor so properties can safely be added to the prototype without
  // affecting other stacks in the same process.

  // Use `Stack#addRequestInitializer()` to add properties to the request as
  // it's instantiated.
  var initializers = [];
  this.Request = function(incomingMessage) {
    BaseRequest.call(this, incomingMessage);

    initializers.forEach(function(func) {
      func.call(this);
    }, this);
  };
  util.inherits(this.Request, BaseRequest);

  // ## Stack#contentTypes

  // Configures the default content types for `html`, `json` and `form`
  // [responses](../doc/Responses.md.html#body). Each stack instance has its own
  // object so properties can safely be modified without affecting other stacks
  // in the same process.
  this.contentTypes = {
    html: 'text/html; charset=utf-8',
    json: 'application/json; charset=utf-8',
    form: 'application/x-www-form-urlencoded; charset=utf-8'
  };

  // ## Stack#chunkifiers

  // Helper methods for converting responses into buffers. Only
  // [`json`](../doc/Responses.md.html#json) and
  // [`form`](../doc/Responses.md.html#form) are defined.
  // Each stack instance has its own object so the implementation can safely be
  // overridden without affecting other stacks in the same process.
  this.chunkifiers = {
    // The default `json` implementation simply uses `JSON.stringify(value)`.
    json: chunkifyJson,
    // The default `form` implementation can only serialize strings, booleans
    // and finite numbers.
    form: chunkifyForm
  };

  this._requestHandler = new RequestHandler(
    this, this.Request, this.contentTypes, this.chunkifiers);

  this._initializers = initializers;
  this._middlewares = [];
  this._finalized = null;
}

util.inherits(Stack, EventEmitter);

module.exports = Stack;

// ## Stack#addRequestInitializer(initializer)

// Registers a function which will be called on a request as it's instantiated.
// Initializers are called in the order in which they've been registered. They
// can be added even after the stack has been finalized.
Stack.prototype.addRequestInitializer = function(initializer) {
  if (typeof initializer !== 'function') {
    throw new TypeError('Expected `initializer` to be a function.');
  }
  this._initializers.push(initializer);

  // Returns the stack for easy chaining.
  return this;
};

// ## Stack#addMiddleware(factory)

// Registers a factory method that returns a middleware function. When the stack
// is finalized each factory is called in order to compute the middleware chain.
// Factories are called with a single argument, being the next function in the
// chain. They're expected to return a function that takes a single `request`
// argument.

// This middleware function should either return a response or call the next
// function with the `request`. The result of calling the next function will
// always be a promise, which should be returned or used to change a response.

// Cannot be called after the stack has been finalized.

// Example factory:

//     function noop(next) {
//       return function(request) {
//         return next(request);
//       };
//     }
Stack.prototype.addMiddleware = function(factory) {
  if (typeof factory !== 'function') {
    throw new TypeError('Expected `factory` to be a function.');
  }
  if (this._finalized) {
    throw new Error('Can’t add middleware once finalized.');
  }
  this._middlewares.push(factory);

  // Returns the stack for easy chaining.
  return this;
};

// ## Stack#install(plugin)

// Installs a plugin: an object that may have `requestInitializer` and / or
// `middleware` functions.
Stack.prototype.install = function(plugin) {
  if (!plugin || typeof plugin !== 'object') {
    throw new TypeError('Expected `plugin` to be an object.');
  }

  if ('requestInitializer' in plugin) {
    this.addRequestInitializer(plugin.requestInitializer);
  }
  if ('middleware' in plugin) {
    this.addMiddleware(plugin.middleware);
  }

  // Returns the stack for easy chaining.
  return this;
};

// ## Stack#finalize(responder)

// Computes the middleware chain, ending with a call to `responder`. A stack can
// only be finalized once.
Stack.prototype.finalize = function(responder) {
  if (this._finalized) {
    throw new Error('Can’t invoke `finalize()` more than once.');
  }

  if (typeof responder !== 'function') {
    throw new TypeError('Expected `responder` to be a function.');
  }
  this._finalized = this._middlewares.reduceRight(function(next, middleware) {
    return middleware(warrantPromise(next));
  }, responder);

  // Returns the stack for easy chaining.
  return this;
};

// ## Stack#setErrorResponse(response)

// Define a standard error response. `response` must be an object with
// `statusCode` and `chunk` properties, and optionally `headers`. The response
// is used based on its status code.

// The `503` response is used when the response promise is rejected with an
// error that has a `cancel` as its `name`. Similarly if the error has `timeout`
// as its `name`, the `504` response is used. For all other errors the `500`
// response is used.
Stack.prototype.setErrorResponse = function(response) {
  if (!response || typeof response !== 'object') {
    throw new TypeError('Expected `response` to be an object.');
  }
  if (!hop.call(response, 'statusCode')) {
    throw new TypeError('Expected `response.statusCode`.');
  }

  this._requestHandler.setErrorResponse(response);

  // Returns the stack for easy chaining.
  return this;
};

// ## Stack#observe(server)

// Handles [`request`
// events](http://nodejs.org/api/http.html#http_event_request) emitted by
// `server`.
Stack.prototype.observe = function(server) {
  if (!this._finalized) {
    throw new Error('Can’t observe server before invoking `finalize()`.');
  }

  this._requestHandler.observe(server, this._finalized);

  // Returns the stack for easy chaining.
  return this;
};

// ## Stack#cancelRequests()

// Cancels all pending response promises.
Stack.prototype.cancelRequests = function() {
  this._requestHandler.cancelAll();
};
