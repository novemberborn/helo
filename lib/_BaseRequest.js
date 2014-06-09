'use strict';

var url = require('url');
var parseForm = require('./parseForm');

function BaseRequest(incomingMessage) {
  this.incomingMessage = incomingMessage;

  this.method = incomingMessage.method;
  this.headers = incomingMessage.headers;
  this.host = incomingMessage.headers.host;

  var parsed = url.parse(incomingMessage.url);
  this.path = parsed.pathname;
  if (parsed.search) {
    this.path += parsed.search;
  }
  this.pathname = parsed.pathname;
  this.querystring = parsed.query;
  if (incomingMessage.method !== 'GET' &&
      incomingMessage.method !== 'DELETE' &&
      incomingMessage.method !== 'HEAD') {
    this.stream = incomingMessage;
  } else {
    this.stream = null;
  }

  this._makeQueryObject = true;
  this._queryObject = null;
}

module.exports = BaseRequest;

Object.defineProperties(BaseRequest.prototype, {
  query: {
    configurable: true,
    set: function(x) {
      this._makeQueryObject = false;
      this._queryObject = x;
    },
    get: function() {
      if (this._makeQueryObject) {
        this._makeQueryObject = false;
        this._queryObject = parseForm(this.querystring);
      }
      return this._queryObject;
    }
  }
});
