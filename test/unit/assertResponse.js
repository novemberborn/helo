'use strict';

var assertResponse = require('../../lib/_assertResponse');

describe('assertResponse(response, allowBody, chunkOnly)', function() {
  function throws(response, message, allowBody, chunkOnly) {
    return function() {
      it('throws a `TypeError`', function() {
        assert.throws(function() {
          assertResponse(response, allowBody, chunkOnly);
        }, TypeError, message);
      });
    };
  }

  describe('`response` is falsey',
    throws(null, 'Expected `response` to be an object.'));

  describe('`response` is truey, but not an object',
    throws(42, 'Expected `response` to be an object.'));

  describe('`response.statusCode`', function() {
    describe('is not a number',
      throws({ statusCode: null }, 'Expected `statusCode` to be a number.'));

    describe('is not a finite number',
      throws(
        { statusCode: Infinity },
        'Expected `statusCode` to be a number.'));
  });

  describe('`response.headers`', function() {
    describe('is falsey',
      throws({ headers: null }, 'Expected `headers` to be an object.'));

    describe('is truey, but not an object',
      throws({ headers: 42 }, 'Expected `headers` to be an object.'));

    describe('contains an empty string as a key',
      throws({ headers: { '': true } }, 'Unexpected empty header name.'));

    describe('contains duplicate, case-insensitive, headers',
      throws(
        { headers: { foo: 'bar', FOO: 'baz' } },
        'Unexpected duplicate `FOO` header.'));

    [
      { desc: 'an object', value: {} },
      { desc: '`null`', value: null },
      { desc: '`undefined`', value: undefined },
      { desc: 'non-finite numbers', value: Infinity }
    ].forEach(function(subject) {
      describe('contains a value that is ' + subject.desc,
        throws(
          { headers: { foo: subject.value } },
          'Unexpected value for `foo` header.'));
    });

    describe('contains an array', function() {
      [
        { desc: 'an object', value: {} },
        { desc: '`null`', value: null },
        { desc: '`undefined`', value: undefined },
        { desc: 'non-finite numbers', value: Infinity },
        { desc: 'an array', value: [] }
      ].forEach(function(subject) {
        describe('which contains a value that is ' + subject.desc,
          throws(
            { headers: { foo: [subject.value] } },
            'Unexpected value for `foo` header.'));
      });
    });

    describe('has the `_alreadySent` flag set',
      throws(
        { headers: { _alreadySent: true } },
        'Headers appear to have been sent in a previous response.'));
  });

  describe('`response.stream`', function() {
    describe('is falsey',
      throws({ stream: null }, 'Expected `stream` to be pipe()able.'));

    describe('is truey but does not have a pipe() function',
      throws(
        { stream: { pipe: null } },
        'Expected `stream` to be pipe()able.'));

    describe('no response body is allowed',
      throws(
        { stream: { pipe: function() {} } },
        'Response contains `stream` but no body is allowed.',
        false));

    describe('only `chunk` is allowed',
      throws(
        { stream: { pipe: function() {} } },
        'Response contains `stream` but only `chunk` is allowed.',
        true, true));

    ['chunk', 'html', 'json', 'form'].forEach(function(body) {
      var response = { stream: { pipe: function() {} } };
      response[body] = true;
      describe('`response.' + body + '` is also set',
        throws(
          response,
          'Unexpected `' + body + '` value when `stream` is present.',
          true));
    });
  });

  describe('`response.chunk`', function() {
    describe('is not a buffer',
      throws({ chunk: null }, 'Expected `chunk` to be a buffer.'));

    describe('no response body is allowed',
      throws(
        { chunk: new Buffer('') },
        'Response contains `chunk` but no body is allowed.',
        false));

    ['html', 'json', 'form'].forEach(function(body) {
      var response = { chunk: new Buffer('') };
      response[body] = true;
      describe('`response.' + body + '` is also set',
        throws(
          response,
          'Unexpected `' + body + '` value when `chunk` is present.',
          true));
    });
  });

  describe('`response.html`', function() {
    describe('is not a string or array',
      throws({ html: null }, 'Expected `html` to be a string or array.'));

    describe('is an array', function() {
      describe('that contains a value that is neither a string or a buffer',
        throws(
          { html: [null] },
          'Expected value at index 0 of `html` array to be a string or buffer.'
        )
      );
    });

    describe('no response body is allowed',
      throws(
        { html: '' },
        'Response contains `html` but no body is allowed.',
        false));

    describe('only `chunk` is allowed',
      throws(
        { html: '' },
        'Response contains `html` but only `chunk` is allowed.',
        true, true));

    ['json', 'form'].forEach(function(body) {
      var response = { html: '' };
      response[body] = true;
      describe('`response.' + body + '` is also set',
        throws(
          response,
          'Unexpected `' + body + '` value when `html` is present.',
          true));
    });
  });

  describe('`response.json`', function() {
    describe('is undefined',
      throws({ json: undefined }, 'Unexpected undefined value for `json`'));

    describe('no response body is allowed',
      throws(
        { json: {} },
        'Response contains `json` but no body is allowed.',
        false));

    describe('only `chunk` is allowed',
      throws(
        { json: {} },
        'Response contains `json` but only `chunk` is allowed.',
        true, true));

    describe('`response.form` is also set',
      throws(
        { json: {}, form: true },
        'Unexpected `form` value when `json` is present.',
        true));
  });

  describe('`response.form`', function() {
    describe('is falsey',
      throws({ form: null }, 'Expected `form` to be an object'));

    describe('is truey but not an object',
      throws({ form: 42 }, 'Expected `form` to be an object'));

    describe('no response body is allowed',
      throws(
        { form: {} },
        'Response contains `form` but no body is allowed.',
        false));

    describe('only `chunk` is allowed',
      throws(
        { form: {} },
        'Response contains `form` but only `chunk` is allowed.',
        true, true));
  });
});
