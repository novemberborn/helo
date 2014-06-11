'use strict';

var Promise = require('legendary').Promise;

var hop = {}.hasOwnProperty;

function HandlingState(incomingMessage, outgoingMessage) {
  this.incomingMessage = incomingMessage;
  this.outgoingMessage = outgoingMessage;
  this.request = null;
  this.response = null;
  this.streaming = false;
}

function RequestHandler(emitter, Request, contentTypes, chunkifiers) {
  this._emitter = emitter;
  this._Request = Request;
  this._contentTypes = contentTypes;
  this._chunkifiers = chunkifiers;

  this._activePromises = [];
  this._errorResponses = {};
}

module.exports = RequestHandler;

RequestHandler.prototype._assertResponse = require('./_assertResponse');

RequestHandler.prototype.setErrorResponse = function(response) {
  this._assertResponse(response, true, false);
  this._errorResponses[response.statusCode] = response;
};

RequestHandler.prototype.observe = function(server, responder) {
  var handler = this;
  server.on('request', function(req, res) {
    handler._handle(req, res, responder);
  });
};

RequestHandler.prototype.cancelAll = function() {
  var active = this._activePromises.slice();
  active.forEach(function(promise) {
    promise.cancel();
  });
};

RequestHandler.prototype._allowBody = function(request, statusCode) {
  return request.method !== 'HEAD' &&
    statusCode !== 204 && statusCode !== 304 &&
    (100 > statusCode || statusCode > 199);
};

RequestHandler.prototype._handle = function(
  incomingMessage, outgoingMessage, responder) {

  var state = new HandlingState(incomingMessage, outgoingMessage);

  var promise;
  try {
    state.request = new this._Request(incomingMessage);
    this._emitter.emit('request', state);

    var result = responder(state.request);
    if (!Promise.isInstance(result)) {
      result = Promise.from(result);
    }

    promise = this._writeResponse(result, state);
    outgoingMessage.once('close', promise.cancel);
  } catch (error) {
    promise = Promise.rejected(error);
  }

  var handler = this;
  this._trackActivity(promise.then(function() {
    outgoingMessage.removeListener('close', promise.cancel);
  }, function(reason) {
    outgoingMessage.removeListener('close', promise.cancel);
    handler._handleError(reason, state);
  }));
};

RequestHandler.prototype._handleError = function(error, state) {
  var statusCode = 500;
  if (error && error.name === 'cancel') {
    statusCode = 503;
    this._emitter.emit('cancelError', state, error);
  } else if (error && error.name === 'timeout') {
    statusCode = 504;
    this._emitter.emit('timeoutError', state, error);
  } else {
    this._emitter.emit('internalError', state, error);
  }

  //Try and end the response if no headers were sent yet. Assumes whatever sent
  //the headers did not crash prior to ending the response.
  var incomingMessage = state.incomingMessage;
  var outgoingMessage = state.outgoingMessage;

  if (!outgoingMessage.headersSent) {
    if (this._errorResponses.hasOwnProperty(statusCode)) {
      var response = this._errorResponses[statusCode];

      outgoingMessage.writeHead(statusCode, response.headers);
      if (incomingMessage.method !== 'HEAD') {
        outgoingMessage.end(response.chunk);
      } else {
        outgoingMessage.end();
      }
    } else {
      outgoingMessage.writeHead(statusCode);
      outgoingMessage.end();
    }
  } else {
    outgoingMessage.destroy();
  }
};

RequestHandler.prototype._trackActivity = function(promise) {
  var activePromises = this._activePromises;
  promise.ensure(function() {
    activePromises.splice(activePromises.indexOf(promise), 1);
  });
  activePromises.push(promise);
};

RequestHandler.prototype._writeResponse = function(promise, state) {
  var handler = this;
  var emitter = this._emitter;
  var contentTypes = this._contentTypes;
  var chunkifiers = this._chunkifiers;

  return promise.then(function(response) {
    state.response = response;

    var statusCode = response && response.statusCode || 200;
    handler._assertResponse(
      response, handler._allowBody(state.request, statusCode), false);

    //The headers object should not be reused, since otherwise sensitive headers
    //like `set-cookie` may be disclosed in subsequent responses.
    if (response.headers) {
      Object.defineProperty(response.headers, '_alreadySent', {
        value: true
      });
    }

    var outgoingMessage = state.outgoingMessage;

    var stream, array, chunk;
    if (response.stream) {
      stream = response.stream;
    } else if (hop.call(response, 'html')) {
      //Assumes writeHead() takes care of overriding what we set here, if
      //content-type is also in response.headers.
      outgoingMessage.setHeader('content-type', contentTypes.html);
      if (typeof response.html === 'string') {
        chunk = new Buffer(response.html, 'utf8');
      } else {
        array = response.html;
      }
    } else if (response.json) {
      outgoingMessage.setHeader('content-type', contentTypes.json);
      chunk = chunkifiers.json(response.json);
    } else if (response.form) {
      outgoingMessage.setHeader('content-type', contentTypes.form);
      chunk = chunkifiers.form(response.form);
    } else if (response.chunk) {
      chunk = response.chunk;
    }

    emitter.emit('response', state);
    outgoingMessage.writeHead(statusCode, response.headers);

    return new Promise(function(resolve, reject) {
      function streamingError(error) {
        emitter.emit('streamingError', state, error);
        reject(error);
        cleanup();

        //Ensure we fail hard when streaming fails.
        outgoingMessage.destroy();
      }
      function finish() {
        emitter.emit('responseFinish', state);
        resolve();
        cleanup();
      }
      function cleanup() {
        if(stream && typeof stream.removeListener === 'function') {
          stream.removeListener('error', streamingError);
        }
        outgoingMessage.removeListener('finish', finish);
      }

      //Resolve when all data has been flushed to the underlying system.
      outgoingMessage.once('finish', finish);

      if (stream) {
        state.streaming = true;
        stream.pipe(outgoingMessage);
        try {
          //Assuming streaming may fail due to an error in producing the data,
          //or because the outgoing message behaves weirdly.
          stream.once('error', streamingError);
        } catch(error) {
          emitter.emit('streamObservationFailed', state, error);
        }
      }else if (array) {
        array.forEach(function(content) {
          outgoingMessage.write(content, 'utf8');
        });
        outgoingMessage.end();
      } else if (chunk) {
        outgoingMessage.end(chunk);
      } else {
        outgoingMessage.end();
      }

      //Assuming the outgoing message emits `close` before `error`. That should
      //cancel this promise due to the 'close' listener set up in #_handle().
      return function() {
        emitter.emit('responseCancel', state);
        cleanup();
      };
    });
  });
};
