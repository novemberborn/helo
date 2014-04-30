'use strict';

var sinon = require('sinon');
var Promise = require('legendary').Promise;
var Thenable = require('legendary/test/support/Thenable');

var Stack = require('../../').Stack;

describe('Middleware:', function() {
  var stack;
  beforeEach(function() {
    stack = new Stack();
  });

  describe('Stack#finalize(responder)', function() {
    it('computes the middleware chain', function() {
      var factoryStubs = [
        sinon.stub().returns(function() {}),
        sinon.stub().returns(function() {}),
        sinon.stub().returns(function() {})
      ];

      factoryStubs.forEach(function(f) {
        stack.addMiddleware(f);
        assert.notCalled(f);
      });

      stack.finalize(function() {});

      assert.callOrder(factoryStubs[2], factoryStubs[1], factoryStubs[0]);
      assert.calledWithMatch(factoryStubs[0], sinon.match.func);
      assert.calledWithMatch(factoryStubs[1], sinon.match.func);
      assert.calledWithMatch(factoryStubs[2], sinon.match.func);
    });
  });

  describe('the middleware chain', function() {
    function makeFactory(middlewares, nextSpies, index) {
      return function(next) {
        // Spy on the `next` method so we can test its return value.
        next = nextSpies[index] = sinon.spy(next);

        // Spy on (not stub) normal middleware behavior.
        middlewares[index] = sinon.spy(function(request) {
          return next(request);
        });

        // But call it indirectly so tests can stub a particular middleware.
        return function(request) {
          return middlewares[index](request);
        };
      };
    }

    var server, incoming, outgoing;
    var responder;
    var middlewares, nextSpies;
    beforeEach(function() {
      server = new stubs.Server();
      incoming = new stubs.IncomingMessage();
      outgoing = new stubs.OutgoingMessage();

      responder = sinon.stub();

      middlewares = [];
      nextSpies = [];

      // Add 3 middleware factories
      stack.addMiddleware(makeFactory(middlewares, nextSpies, 0));
      stack.addMiddleware(makeFactory(middlewares, nextSpies, 1));
      stack.addMiddleware(makeFactory(middlewares, nextSpies, 2));

      stack.finalize(responder).observe(server);
    });

    describe('when handling a request', function() {
      it('invokes each middleware in order, up to the responder', function() {
        server.emitRequest(incoming, outgoing);

        assert.callOrder(
          middlewares[0], middlewares[1], middlewares[2]);
      });

      it('returns a promise', function() {
        server.emitRequest(incoming, outgoing);
        assert.instanceOf(middlewares[0].firstCall.returnValue, Promise);
      });

      describe('cancellation of the promise', function() {
        it('propagates to the promise returned by responder', function() {
          var cancelSpy = sinon.spy();
          responder.returns(new Promise(function() { return cancelSpy; }));

          server.emitRequest(incoming, outgoing);
          middlewares[0].firstCall.returnValue.cancel();

          assert.calledOnce(cancelSpy);
        });
      });

      describe('the return value of `next`', function() {
        it('is always a promise', function() {
          server.emitRequest(incoming, outgoing);

          nextSpies.forEach(function(spy) {
            assert.instanceOf(spy.firstCall.returnValue, Promise);
          });
        });
      });

      describe('the `responder`', function() {
        describe('returns a value', function() {
          describe('the value', function() {
            it('is propagated through the chain', function() {
              responder.returns(sentinels.foo);
              server.emitRequest(incoming, outgoing);

              return Promise.all(middlewares.map(function(m) {
                return assert.eventually.matchingSentinels(
                  m.firstCall.returnValue,
                  sentinels.foo);
              }));
            });
          });
        });

        describe('throws an error', function() {
          describe('the error', function() {
            it('is propagated through the chain', function() {
              responder.throws(sentinels.foo);
              server.emitRequest(incoming, outgoing);

              return Promise.all(middlewares.map(function(m) {
                return assert.isRejected(
                  m.firstCall.returnValue,
                  sentinels.Sentinel);
              }));
            });
          });
        });

        describe('returns a promise', function() {
          describe('the fulfillment value', function() {
            it('is propagated through the chain', function() {
              responder.returns(Promise.from(sentinels.foo));
              server.emitRequest(incoming, outgoing);

              return Promise.all(middlewares.map(function(m) {
                return assert.eventually.matchingSentinels(
                  m.firstCall.returnValue,
                  sentinels.foo);
              }));
            });
          });

          describe('the rejection reason', function() {
            it('is propagated through the chain', function() {
              responder.returns(Promise.rejected(sentinels.foo));
              server.emitRequest(incoming, outgoing);

              return Promise.all(middlewares.map(function(m) {
                return assert.isRejected(
                  m.firstCall.returnValue,
                  sentinels.Sentinel);
              }));
            });
          });
        });

        describe('returns a thenable', function() {
          describe('the fulfillment value', function() {
            it('is propagated through the chain', function() {
              responder.returns(new Thenable(function(resolve) {
                resolve(sentinels.foo);
              }));
              server.emitRequest(incoming, outgoing);

              return Promise.all(middlewares.map(function(m) {
                return assert.eventually.matchingSentinels(
                  m.firstCall.returnValue,
                  sentinels.foo);
              }));
            });
          });

          describe('the rejection reason', function() {
            it('is propagated through the chain', function() {
              responder.returns(new Thenable(function(_, reject) {
                reject(sentinels.foo);
              }));
              server.emitRequest(incoming, outgoing);

              return Promise.all(middlewares.map(function(m) {
                return assert.isRejected(
                  m.firstCall.returnValue,
                  sentinels.Sentinel);
              }));
            });
          });
        });
      });

      describe('a middleware', function() {
        var stubbed;
        beforeEach(function() {
          stubbed = middlewares[1] = sinon.stub();
        });

        describe('returns a value', function() {
          describe('the value', function() {
            it('is propagated through the chain', function() {
              stubbed.returns(sentinels.foo);
              server.emitRequest(incoming, outgoing);

              return assert.eventually.matchingSentinels(
                middlewares[0].firstCall.returnValue,
                sentinels.foo);
            });
          });
        });

        describe('throws an error', function() {
          describe('the error', function() {
            it('is propagated through the chain', function() {
              stubbed.throws(sentinels.foo);
              server.emitRequest(incoming, outgoing);

              return assert.isRejected(
                middlewares[0].firstCall.returnValue,
                sentinels.Sentinel);
            });
          });
        });

        describe('returns a promise', function() {
          describe('the fulfillment value', function() {
            it('is propagated through the chain', function() {
              stubbed.returns(Promise.from(sentinels.foo));
              server.emitRequest(incoming, outgoing);

              return assert.eventually.matchingSentinels(
                middlewares[0].firstCall.returnValue,
                sentinels.foo);
            });
          });

          describe('the rejection reason', function() {
            it('is propagated through the chain', function() {
              stubbed.returns(Promise.rejected(sentinels.foo));
              server.emitRequest(incoming, outgoing);

              return assert.isRejected(
                middlewares[0].firstCall.returnValue,
                sentinels.foo);
            });
          });
        });

        describe('returns a thenable', function() {
          describe('the fulfillment value', function() {
            it('is propagated through the chain', function() {
              stubbed.returns(new Thenable(function(resolve) {
                resolve(sentinels.foo);
              }));
              server.emitRequest(incoming, outgoing);

              return assert.eventually.matchingSentinels(
                middlewares[0].firstCall.returnValue,
                sentinels.foo);
            });
          });

          describe('the rejection reason', function() {
            it('is propagated through the chain', function() {
              stubbed.returns(new Thenable(function(_, reject) {
                reject(sentinels.foo);
              }));
              server.emitRequest(incoming, outgoing);

              return assert.isRejected(
                middlewares[0].firstCall.returnValue,
                sentinels.foo);
            });
          });
        });
      });
    });
  });
});
