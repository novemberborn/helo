'use strict';

var hop = {}.hasOwnProperty;

function assertHeaderValue(value, header, inArray) {
  if (typeof value === 'string' ||
      typeof value === 'number' && isFinite(value) ||
      typeof value === 'boolean') {
    return true;
  }

  if (!inArray && Array.isArray(value)) {
    return value.every(function(value) {
      assertHeaderValue(value, header, true);
    });
  }

  throw new TypeError('Unexpected value for `' + header + '` header.');
}

function assertHeaders(headers) {
  if (headers._alreadySent) {
    throw new TypeError(
      'Headers appear to have been sent in a previous response.');
  }

  var encountered = {};
  Object.keys(headers).forEach(function(h) {
    if (!h) {
      throw new TypeError('Unexpected empty header name.');
    }

    var lowercased = h.toLowerCase();
    if (hop.call(encountered, lowercased)) {
      throw new TypeError('Unexpected duplicate `' + h + '` header.');
    }

    assertHeaderValue(headers[h], h, false);
    encountered[lowercased] = true;
  });
}

function assertHtmlBody(chunkOrString, index) {
  if (typeof chunkOrString !== 'string' && !Buffer.isBuffer(chunkOrString)) {
    throw new TypeError('Expected value at index ' + index + ' of `html` ' +
      'array to be a string or buffer.');
  }
}

function assertBody(response, allowBody, chunkOnly) {
  if (hop.call(response, 'stream')) {
    if (!response.stream || typeof response.stream.pipe !== 'function') {
      throw new TypeError('Expected `stream` to be pipe()able.');
    }

    if (!allowBody) {
      throw new TypeError('Response contains `stream` but no body is allowed.');
    }
    if (chunkOnly) {
      throw new TypeError(
        'Response contains `stream` but only `chunk` is allowed.');
    }

    if (hop.call(response, 'chunk')) {
      throw new TypeError('Unexpected `chunk` value when `stream` is present.');
    }
    if (hop.call(response, 'html')) {
      throw new TypeError('Unexpected `html` value when `stream` is present.');
    }
    if (hop.call(response, 'json')) {
      throw new TypeError('Unexpected `json` value when `stream` is present.');
    }
    if (hop.call(response, 'form')) {
      throw new TypeError('Unexpected `form` value when `stream` is present.');
    }
  }

  if (hop.call(response, 'chunk')) {
    if (!Buffer.isBuffer(response.chunk)) {
      throw new TypeError('Expected `chunk` to be a buffer.');
    }

    if (!allowBody) {
      throw new TypeError('Response contains `chunk` but no body is allowed.');
    }

    if (hop.call(response, 'html')) {
      throw new TypeError('Unexpected `html` value when `chunk` is present.');
    }
    if (hop.call(response, 'json')) {
      throw new TypeError('Unexpected `json` value when `chunk` is present.');
    }
    if (hop.call(response, 'form')) {
      throw new TypeError('Unexpected `form` value when `chunk` is present.');
    }
  }

  if (hop.call(response, 'html')) {
    if (typeof response.html !== 'string') {
      if (!Array.isArray(response.html)) {
        throw new TypeError('Expected `html` to be a string or array.');
      }

      response.html.forEach(assertHtmlBody);
    }

    if (!allowBody) {
      throw new TypeError('Response contains `html` but no body is allowed.');
    }
    if (chunkOnly) {
      throw new TypeError(
        'Response contains `html` but only `chunk` is allowed.');
    }

    if (hop.call(response, 'json')) {
      throw new TypeError('Unexpected `json` value when `html` is present.');
    }
    if (hop.call(response, 'form')) {
      throw new TypeError('Unexpected `form` value when `html` is present.');
    }
  }

  if (hop.call(response, 'json')) {
    if (typeof response.json === 'undefined') {
      throw new TypeError('Unexpected undefined value for `json`.');
    }

    if (!allowBody) {
      throw new TypeError('Response contains `json` but no body is allowed.');
    }
    if (chunkOnly) {
      throw new TypeError(
        'Response contains `json` but only `chunk` is allowed.');
    }

    if (hop.call(response, 'form')) {
      throw new TypeError('Unexpected `form` value when `json` is present.');
    }
  }

  if (hop.call(response, 'form')) {
    if (!response.form || typeof response.form !== 'object') {
      throw new TypeError('Expected `form` to be an object.');
    }

    if (!allowBody) {
      throw new TypeError('Response contains `form` but no body is allowed.');
    }
    if (chunkOnly) {
      throw new TypeError(
        'Response contains `form` but only `chunk` is allowed.');
    }
  }
}

function assertResponse(response, allowBody, chunkOnly) {
  if (!response || typeof response !== 'object') {
    throw new TypeError('Expected `response` to be an object.');
  }

  if (hop.call(response, 'statusCode')) {
    var statusCode = response.statusCode;
    if (typeof statusCode !== 'number' || !isFinite(statusCode)) {
      throw new TypeError('Expected `statusCode` to be a number.');
    }
  }

  if (hop.call(response, 'headers')) {
    if (!response.headers || typeof response.headers !== 'object') {
      throw new TypeError('Expected `headers` to be an object.');
    }

    assertHeaders(response.headers);
  }

  assertBody(response, allowBody, chunkOnly);
}

module.exports = assertResponse;
