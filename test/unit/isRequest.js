'use strict';

var isRequest = require('../../').isRequest;
var Base = require('../../lib/_BaseRequest');

describe('isRequest(obj)', function() {
  describe('`obj` is an instance of `_BaseRequest', function() {
    it('returns `true`', function() {
      assert.isTrue(isRequest(new Base(new stubs.IncomingMessage())));
    });
  });

  describe('`obj` is not an instance of `_BaseRequest', function() {
    it('returns `false`', function() {
      assert.isFalse(isRequest({}));
    });
  });
});
