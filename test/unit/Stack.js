'use strict';

var EventEmitter = require('events').EventEmitter;

var sinon = require('sinon');
var Promise = require('legendary').Promise;

var Stack = require('../../').Stack;
var BaseRequest = require('../../lib/_BaseRequest');

describe('Stack', function() {
  var stack;
  beforeEach(function() {
    stack = new Stack();
  });

  describe('Stack()', function() {
    describe('extends `EventEmitter`', function() {
      var callSpy;
      beforeEach(function() {
        callSpy = sinon.spy(EventEmitter, 'call');
      });
      afterEach(function() {
        callSpy.restore();
      });

      it('returns an instance of `EventEmitter`', function() {
        assert.instanceOf(new Stack(), EventEmitter);
      });

      it('invokes the `EventEmitter` constructor', function() {
        var s = new Stack();

        assert.calledOnce(callSpy);
        assert.calledWithExactly(callSpy, s);
      });
    });

    describe('called without `new`', function() {
      it('returns an instance regardless', function() {
        /*jshint newcap:false*/
        assert.instanceOf(Stack(), Stack);
      });
    });

    describe('creates a `Request` class', function() {
      it('is a function', function() {
        assert.isFunction(new Stack().Request);
      });

      it('is different between stacks', function() {
        assert.notStrictEqual(new Stack().Request, new Stack().Request);
      });

      describe('extends `BaseRequest`', function() {
        var callSpy, Request, incoming;
        beforeEach(function() {
          callSpy = sinon.spy(BaseRequest, 'call');
          Request = new Stack().Request;
          incoming = new stubs.IncomingMessage();
        });
        afterEach(function() {
          callSpy.restore();
        });

        it('returns an instance of `BaseRequest`', function() {
          assert.instanceOf(new Request(incoming), BaseRequest);
        });

        it('invokes the `BaseRequest` constructor', function() {
          var r = new Request(incoming);

          assert.calledOnce(callSpy);
          assert.calledWithExactly(callSpy, r, incoming);
        });
      });
    });

    describe('configures `contentTypes`', function() {
      it('has the expected properties', function() {
        var types = new Stack().contentTypes;
        assert.property(types, 'html');
        assert.property(types, 'json');
        assert.property(types, 'form');
      });

      it('is different between stacks', function() {
        assert.notStrictEqual(
          new Stack().contentTypes, new Stack().contentTypes);
      });
    });

    describe('sets up `chunkifiers`', function() {
      it('has the expected properties', function() {
        var chunkifiers = new Stack().chunkifiers;
        assert.property(chunkifiers, 'json');
        assert.property(chunkifiers, 'form');
        assert.isFunction(chunkifiers.json);
        assert.isFunction(chunkifiers.form);
      });

      it('is different between stacks', function() {
        assert.notStrictEqual(new Stack().chunkifiers, new Stack().chunkifiers);
      });
    });
  });

  describe('#addRequestInitializer(initializer)', function() {
    describe('`initializer` is not a function', function() {
      it('throws a `TypeError`', function() {
        assert.throws(function() {
          stack.addRequestInitializer(null);
        }, TypeError, 'Expected `initializer` to be a function.');
      });
    });

    it('returns `this`', function() {
      assert.strictEqual(stack.addRequestInitializer(function() {}), stack);
    });
  });

  describe('#addMiddleware(factory)', function() {
    describe('`factory` is not a function', function() {
      it('throws a `TypeError`', function() {
        assert.throws(function() {
          stack.addMiddleware(null);
        }, TypeError, 'Expected `factory` to be a function.');
      });
    });

    describe('once finalized', function() {
      it('throws an `Error`', function() {
        stack.finalize(function() {});

        assert.throws(function() {
          stack.addMiddleware(function() {});
        }, Error, 'Can’t add middleware once finalized.');
      });
    });

    it('returns `this`', function() {
      assert.strictEqual(stack.addMiddleware(function() {}), stack);
    });
  });

  describe('#install(plugin)', function() {
    it('returns `this`', function() {
      assert.strictEqual(stack.install({}), stack);
    });

    describe('`plugin` is falsey', function() {
      it('throws a `TypeError', function() {
        assert.throws(function() {
          stack.install(null);
        }, TypeError, 'Expected `plugin` to be an object.');
      });
    });

    describe('`plugin` is truey, but not an object', function() {
      it('throws a `TypeError', function() {
        assert.throws(function() {
          stack.install('42');
        }, TypeError, 'Expected `plugin` to be an object.');
      });
    });

    describe('with `plugin.requestInitializer`', function() {
      it('passes the initializer to `#addRequestInitializer()`', function() {
        var stub = sinon.stub(stack, 'addRequestInitializer');
        stack.install({ requestInitializer: sentinels.foo });
        assert.calledWithExactly(stub, sentinels.foo);
      });
    });

    describe('with `plugin.middleware`', function() {
      it('passes the middleware to `#addMiddleware()`', function() {
        var stub = sinon.stub(stack, 'addMiddleware');
        stack.install({ middleware: sentinels.foo });
        assert.calledWithExactly(stub, sentinels.foo);
      });
    });
  });

  describe('#finalize(responder)', function() {
    it('returns `this`', function() {
      assert.strictEqual(stack.finalize(function() {}), stack);
    });

    describe('`responder` is not a function', function() {
      it('throws a `TypeError', function() {
        assert.throws(function() {
          stack.finalize('42');
        }, TypeError, 'Expected `responder` to be a function.');
      });
    });

    describe('once finalized', function() {
      it('throws an `Error`', function() {
        stack.finalize(function() {});

        assert.throws(function() {
          stack.finalize(function() {});
        }, Error, 'Can’t invoke `finalize()` more than once.');
      });
    });
  });

  describe('#setErrorResponse(response)', function() {
    function throwsError(response, message) {
      it('throws a `TypeError', function() {
        assert.throws(function() {
          stack.setErrorResponse(response);
        }, TypeError, message);
      });
    }

    it('returns `this`', function() {
      assert.strictEqual(
        stack.setErrorResponse({ statusCode: 500 }),
        stack);
    });

    describe('`response` is falsey', function() {
      throwsError(null, 'Expected `response` to be an object.');
    });

    describe('`response` is truey, but not an object', function() {
      throwsError('42', 'Expected `response` to be an object.');
    });

    describe('`response` has no `statusCode` property', function() {
      throwsError({}, 'Expected `response.statusCode`.');
    });

    it('relies on `RequestHandler#setErrorResponse(response)`', function() {
      var stub = sinon.stub(stack._requestHandler, 'setErrorResponse');
      var response = new sentinels.Sentinel({
        statusCode: { value: 200 }
      });

      stack.setErrorResponse(response);

      assert.calledWithExactly(stub, response);
    });
  });

  describe('#observe(server)', function() {
    it('returns `this`', function() {
      stack.finalize(function() {});
      assert.strictEqual(stack.observe(new stubs.Server()), stack);
    });

    describe('called before finalized', function() {
      it('throws an `Error`', function() {
        assert.throws(function() {
          stack.observe(new stubs.Server());
        }, Error, 'Can’t observe server before invoking `finalize()`.');
      });
    });

    it('listens for `request` events on the server', function() {
      var server = new stubs.Server();
      var spy = sinon.spy(server, 'on');

      stack.finalize(function() {});
      stack.observe(server);

      assert.calledOnce(spy);
      assert.calledWithMatch(spy, 'request', sinon.match.func);
    });

    it('relies on `RequestHandler#observe(server, responder)`', function() {
      var stub = sinon.stub(stack._requestHandler, 'observe');

      stack.finalize(function() {});
      stack.observe(sentinels.foo);

      assert.calledWithMatch(stub, sentinels.foo, sinon.match.func);
    });
  });

  describe('#cancelRequests()', function() {
    it('does *not* return `this`', function() {
      assert.isUndefined(stack.cancelRequests());
    });

    it('cancels pending response promises', function() {
      var cancelSpy = sinon.spy();
      var promises = [
        Promise.from(),
        new Promise(function() { return cancelSpy; }),
        new Promise(function() { return cancelSpy; })
      ];

      stack.finalize(function() {
        return promises.shift();
      });

      var server = new stubs.Server();
      stack.observe(server);

      server.emitRequest(
        new stubs.IncomingMessage(), new stubs.OutgoingMessage());
      server.emitRequest(
        new stubs.IncomingMessage(), new stubs.OutgoingMessage());
      server.emitRequest(
        new stubs.IncomingMessage(), new stubs.OutgoingMessage());

      assert.lengthOf(promises, 0);

      stack.cancelRequests();

      return Promise.from().then(function() {
        assert.calledTwice(cancelSpy);
      });
    });

    it('relies on `RequestHandler#cancelAll()`', function() {
      var stub = sinon.stub(stack._requestHandler, 'cancelAll');

      stack.cancelRequests();

      assert.calledOnce(stub);
      assert.calledWithExactly(stub);
    });
  });
});
