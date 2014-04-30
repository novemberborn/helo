'use strict';

var EventEmitter = require('events').EventEmitter;

var Sentinel = require('chai-sentinels').Sentinel;

var instanceCount = 0;

exports.IncomingMessage = function(label, method, url) {
  instanceCount++;
  if (!label) {
    label = 'stubbed-incoming-message-' + instanceCount;
  }

  return new Sentinel(label, {
    method: {
      value: method || new Sentinel(label + '-method')
    },
    headers: {
      value: new Sentinel(label + '-headers', {
        host: {
          value: new Sentinel(label + '-host-header')
        }
      })
    },
    url: {
      value: url || '/'
    }
  });
};

exports.OutgoingMessage = function(label) {
  instanceCount++;
  if (!label) {
    label = 'stubbed-outgoing-message-' + instanceCount;
  }

  var emitter = new EventEmitter();
  return new Sentinel(label, {
    headersSent: {
      value: false,
      writable: true
    },
    on: {
      value: emitter.on.bind(emitter),
      writable: true
    },
    once: {
      value: emitter.once.bind(emitter),
      writable: true
    },
    emit: {
      value: function() {},
      writable: true
    },
    removeListener: {
      value: emitter.removeListener.bind(emitter),
      writable: true
    },
    setHeader: {
      value: function() {},
      writable: true
    },
    writeHead: {
      value: function() {
        this.headersSent = true;
      },
      writable: true
    },
    write: {
      value: function() {},
      writable: true
    },
    end: {
      value: function() {},
      writable: true
    },
    destroy: {
      value: function() {},
      writable: true
    },
    emitFinish: {
      value: function() {
        emitter.emit('finish');
      }
    },
    emitClose: {
      value: function() {
        emitter.emit('close');
      }
    }
  });
};

exports.Server = function(label) {
  instanceCount++;
  if (!label) {
    label = 'stubbed-server-' + instanceCount;
  }

  var emitter = new EventEmitter();
  return new Sentinel(label, {
    on: {
      value: emitter.on.bind(emitter),
      writable: true
    },
    once: {
      value: emitter.once.bind(emitter),
      writable: true
    },
    removeListener: {
      value: emitter.removeListener.bind(emitter),
      writable: true
    },
    emitRequest: {
      value: function(req, res) { emitter.emit('request', req, res); }
    }
  });
};

exports.Stream = function(label) {
  instanceCount++;
  if (!label) {
    label = 'stubbed-stream-' + instanceCount;
  }

  var emitter = new EventEmitter();
  return new Sentinel(label, {
    pipe: {
      value: function() {},
      writable: true,
    },
    on: {
      value: emitter.on.bind(emitter),
      writable: true
    },
    once: {
      value: emitter.once.bind(emitter),
      writable: true
    },
    removeListener: {
      value: emitter.removeListener.bind(emitter),
      writable: true
    }
  });
};
