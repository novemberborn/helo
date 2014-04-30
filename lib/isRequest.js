'use strict';

var BaseRequest = require('./_BaseRequest');

// # isRequest(obj)

// Returns `true` if `obj` is an instance of the base request class.
function isRequest(obj) {
  return obj instanceof BaseRequest;
}

module.exports = isRequest;
