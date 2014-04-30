'use strict';

var sinon = require('sinon');

var Stack = require('../../').Stack;

describe('Request initializers:', function() {
  describe('Stack#Request(incomingMessage)', function() {
    it('calls the initializers, in order', function() {
      var stack = new Stack();
      var spies = [sinon.spy(), sinon.spy(), sinon.spy()];
      spies.forEach(function(spy) {
        stack.addRequestInitializer(spy);
      });

      var request = new stack.Request(new stubs.IncomingMessage());

      assert.callOrder(spies[0], spies[1], spies[2]);
      assert.alwaysCalledOn(spies[0], request);
      assert.alwaysCalledOn(spies[1], request);
      assert.alwaysCalledOn(spies[2], request);
    });
  });
});
