'use strict';

var Promise = require('legendary').Promise;

function warrantPromise(next) {
  return function(request) {
    try {
      return Promise.from(next(request));
    } catch (error) {
      return Promise.rejected(error);
    }
  };
}

module.exports = warrantPromise;
