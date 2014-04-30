'use strict';

var sinon = require('sinon');
var Promise = require('legendary').Promise;
var delay = require('legendary').timed.delay;

var Stack = require('../../').Stack;
var assertResponse = require('../../lib/_assertResponse');

describe('RequestHandler', function() {
  var incoming, outgoing, mockedOutgoing;
  var stack, handler, mockedHandler;
  var responder;
  beforeEach(function() {
    incoming = new stubs.IncomingMessage();
    outgoing = new stubs.OutgoingMessage();
    mockedOutgoing = sinon.mock(outgoing);

    stack = new Stack();
    handler = stack._requestHandler;
    mockedHandler = sinon.mock(handler);

    responder = sinon.stub();
  });

  describe('#_assertResponse()', function() {
    it('is the expected function', function() {
      assert.strictEqual(handler._assertResponse, assertResponse);
    });
  });

  describe('#setErrorResponse(response)', function() {
    it('asserts `response`', function() {
      mockedHandler.expects('_assertResponse').once()
        .withExactArgs(sentinels.foo, true, false);

      handler.setErrorResponse(sentinels.foo);

      mockedHandler.verify();
    });
  });

  describe('#_allowBody(request, statusCode)', function() {
    function allows(method, statusCode) {
      it('allows a body', function() {
        assert.isTrue(
          handler._allowBody({ method: method }, statusCode || 200));
      });
    }
    function disallows(method, statusCode) {
      it('does not allow a body', function() {
        assert.isFalse(
          handler._allowBody({ method: method }, statusCode || 200));
      });
    }

    describe('`request.method` is HEAD', function() {
      disallows('HEAD');
    });

    describe('`request.method` is not HEAD', function() {
      allows('GET');
    });

    [100, 150, 199, 204, 304].forEach(function(code) {
      describe('`' + code + '` status code', function() {
        disallows('GET', code);
      });
    });

    [99, 200].forEach(function(code) {
      describe('`' + code + '` status code', function() {
        allows('GET', code);
      });
    });
  });

  describe('#_handle(incoming, outgoing, responder)', function() {
    var matchState;
    beforeEach(function() {
      matchState = sinon.match({
        incomingMessage: sinon.match.same(incoming),
        outgoingMessage: sinon.match.same(outgoing),
        request: sinon.match.instanceOf(handler._Request),
        response: null,
        streaming: false
      });
    });

    describe('`responder`', function() {
      it('is called with a request', function() {
        handler._handle(incoming, outgoing, responder);

        assert.calledOnce(responder);
        assert.calledWithMatch(
          responder, sinon.match.instanceOf(handler._Request));
      });

      describe('throws', function() {
        it('calls `#_handleError()`', function(done) {
          mockedHandler.expects('_handleError').once()
            .withExactArgs(sentinels.foo, matchState);

          responder.throws(sentinels.foo);
          handler._handle(incoming, outgoing, responder);

          setTimeout(function() {
            mockedHandler.verify();
            done();
          }, 5);
        });
      });

      describe('results in a rejected promise', function() {
        it('calls `#_handleError()`', function(done) {
          mockedHandler.expects('_handleError').once()
            .withExactArgs(sentinels.foo, matchState);

          responder.returns(Promise.rejected(sentinels.foo));
          handler._handle(incoming, outgoing, responder);

          setTimeout(function() {
            mockedHandler.verify();
            done();
          }, 5);
        });
      });

      describe('returns a value', function() {
        it('calls `#_writeResponse()`', function() {
          var expectation = mockedHandler.expects('_writeResponse').once()
            .withExactArgs(sinon.match.instanceOf(Promise), matchState);

          responder.returns(sentinels.foo);
          handler._handle(incoming, outgoing, responder);

          mockedHandler.verify();
          return assert.eventually.matchingSentinels(
            expectation.firstCall.args[0], sentinels.foo);
        });
      });

      describe('returns a promise', function() {
        it('calls `#_writeResponse()`', function() {
          var p = Promise.from(sentinels.foo);

          mockedHandler.expects('_writeResponse').once()
            .withExactArgs(p, matchState);

          responder.returns(p);
          handler._handle(incoming, outgoing, responder);

          mockedHandler.verify();
        });

        describe('while pending, and the outgoing message emits `close`',
          function() {
            it('is cancelled', function() {
              var cancelSpy = sinon.spy();
              var p = new Promise(function() { return cancelSpy; });

              responder.returns(p);
              handler._handle(incoming, outgoing, responder);

              outgoing.emitClose();

              return p.otherwise(function() {
                assert.calledOnce(cancelSpy);
              });
            });
          });
      });
    });

    it('tracks the activity', function() {
      mockedHandler.expects('_trackActivity').once()
        .withExactArgs(sinon.match.instanceOf(Promise));

      handler._handle(incoming, outgoing, responder);

      mockedHandler.verify();
    });
  });

  describe('#_handleError(error, state)', function() {
    describe('called after headers have been sent', function() {
      it('destroys the outgoing message', function() {
        mockedOutgoing.expects('destroy').once();
        outgoing.headersSent = true;

        handler._handleError({}, { outgoingMessage: outgoing });

        mockedOutgoing.verify();
      });
    });

    describe('no error response is set', function() {
      it('writes a status code and an empty response', function() {
        mockedOutgoing.expects('writeHead').once().withExactArgs(500);
        mockedOutgoing.expects('end').once().withExactArgs();

        handler._handleError({}, { outgoingMessage: outgoing });

        mockedOutgoing.verify();
      });
    });

    describe('error response has been set', function() {
      var chunk;
      beforeEach(function() {
        chunk = new Buffer('foo');
        handler.setErrorResponse({
          statusCode: 500,
          headers: sentinels.foo,
          chunk: chunk
        });
      });

      describe('the request method is HEAD', function() {
        it('writes just the head', function() {
          mockedOutgoing.expects('writeHead').once()
            .withExactArgs(500, sentinels.foo);
          mockedOutgoing.expects('end').once().withExactArgs();

          handler._handleError({}, {
            incomingMessage: { method: 'HEAD' },
            outgoingMessage: outgoing
          });

          mockedOutgoing.verify();
        });
      });

      describe('the request method is not HEAD', function() {
        it('writes the head and body', function() {
          mockedOutgoing.expects('writeHead').once()
            .withExactArgs(500, sentinels.foo);
          mockedOutgoing.expects('end').once().withExactArgs(chunk);

          handler._handleError({}, {
            incomingMessage: { method: 'GET' },
            outgoingMessage: outgoing
          });

          mockedOutgoing.verify();
        });
      });
    });
  });

  describe('#_trackActivity(promise)', function() {
    it('adds to `#_activePromises`', function() {
      var p1 = new Promise(function() {});
      var p2 = new Promise(function() {});

      handler._trackActivity(p1);
      handler._trackActivity(p2);

      assert.deepEqual(handler._activePromises, [p1, p2]);
    });

    describe('when `promise` is fulfilled', function() {
      it('is removed from `#_activePromises`', function() {
        var resolve;
        var p1 = new Promise(function(r) { resolve = r; });
        var p2 = new Promise(function() {});

        handler._trackActivity(p1);
        handler._trackActivity(p2);

        assert.deepEqual(handler._activePromises, [p1, p2]);

        resolve();
        return p1.then(function() {
          assert.deepEqual(handler._activePromises, [p2]);
        });
      });
    });

    describe('when `promise` is rejected', function() {
      it('is removed from `#_activePromises`', function() {
        var reject;
        var p1 = new Promise(function(_, r) { reject = r; });
        var p2 = new Promise(function() {});

        handler._trackActivity(p1);
        handler._trackActivity(p2);

        assert.deepEqual(handler._activePromises, [p1, p2]);

        reject();
        return p1.then(function() {
          assert.deepEqual(handler._activePromises, [p2]);
        });
      });
    });
  });

  describe('#_writeResponse(promise, state)', function() {
    it('returns a promise', function() {
      var p = new Promise(function() {});
      assert.instanceOf(handler._writeResponse(p, {}), Promise);
    });

    describe('when `promise` fulfills', function() {
      describe('and the value is an object with a `statusCode`', function() {
        describe('`#_allowBody()`', function() {
          it('is called with the request and the `statusCode`', function() {
            mockedHandler.expects('_allowBody').once()
              .withExactArgs(sentinels.bar, sentinels.foo);

            var p = Promise.from({ statusCode: sentinels.foo });
            handler._writeResponse(p, { request: sentinels.bar });

            return p.then(function() {
              mockedHandler.verify();
            });
          });
        });
      });

      describe('and the value is an object without a `statusCode`', function() {
        describe('`#_allowBody()`', function() {
          it('is called with the request and the default status code',
            function() {
              mockedHandler.expects('_allowBody').once()
                .withExactArgs(sentinels.bar, 200);

              var p = Promise.from({});
              handler._writeResponse(p, { request: sentinels.bar });

              return p.then(function() {
                mockedHandler.verify();
              });
            });
        });
      });

      describe('and the value is falsey', function() {
        describe('`#_allowBody()`', function() {
          it('is called with the request and the default status code',
            function() {
              mockedHandler.expects('_allowBody').once()
                .withExactArgs(sentinels.bar, 200);

              var p = Promise.from(null);
              handler._writeResponse(p, { request: sentinels.bar });

              return p.then(function() {
                mockedHandler.verify();
              });
            });
        });
      });

      describe('`#_assertResponse()`', function() {
        it('is called with the value and result of `#_allowBody()`',
          function() {
            mockedHandler.expects('_assertResponse').once()
              .withExactArgs(sentinels.foo, sentinels.bar, false);

            sinon.stub(handler, '_allowBody').returns(sentinels.bar);

            var p = Promise.from(sentinels.foo);
            handler._writeResponse(p, {});

            return p.then(function() {
              mockedHandler.verify();
            });
          });

        describe('throws', function() {
          describe('the returned promise', function() {
            it('is rejected', function() {
              sinon.stub(handler, '_assertResponse').throws(sentinels.foo);

              return assert.isRejected(
                handler._writeResponse(Promise.from(), { request: {} }),
                sentinels.Sentinel);
            });
          });
        });
      });

      describe('rejection of `promise`', function() {
        it('propagates to the returned promise', function() {
          var p = Promise.rejected(sentinels.foo);
          var returned = handler._writeResponse(p).otherwise(function(reason) {
            return reason;
          });

          return assert.eventually.matchingSentinels(returned, sentinels.foo);
        });
      });

      describe('the returned promise', function() {
        describe('while pending, and the outgoing message emits `close`',
          function() {
            it('is cancelled', function() {
              var cancelSpy = sinon.spy();
              var p = new Promise(function() { return cancelSpy; });

              sinon.stub(handler, '_writeResponse').returns(p);
              handler._handle(incoming, outgoing, responder);

              outgoing.emitClose();

              return p.otherwise(function() {
                assert.calledOnce(cancelSpy);
              });
            });
          });

        describe('is fulfilled', function() {
          it('removes the `close` listener from the outgoing message',
            function() {
              var spy = sinon.spy(outgoing, 'removeListener');

              var p = Promise.from();
              sinon.stub(handler, '_writeResponse').returns(p);
              handler._handle(incoming, outgoing, responder);


              return p.then(function() {
                assert.calledOnce(spy);
                assert.calledWithExactly(spy, 'close', sinon.match.func);
              });
            });
        });

        describe('is rejected', function() {
          it('removes the `close` listener from the outgoing message',
            function() {
              var spy = sinon.spy(outgoing, 'removeListener');

              var p = Promise.rejected();
              sinon.stub(handler, '_writeResponse').returns(p);
              handler._handle(incoming, outgoing, responder);


              return p.then(function() {
                assert.calledOnce(spy);
                assert.calledWithExactly(spy, 'close', sinon.match.func);
              });
            });
        });
      });
    });

    describe('when piping a response stream', function() {
      var mockedStream;
      beforeEach(function() {
        mockedStream = sinon.mock(new stubs.Stream());
        sinon.stub(mockedStream.object, 'once');
      });

      describe('and the stream emits `error`', function() {
        it('destroys the outgoing message', function(done) {
          mockedStream.object.once.yieldsAsync(sentinels.foo);
          mockedOutgoing.expects('destroy').once();

          handler._writeResponse(Promise.from({
            stream: mockedStream.object
          }), {
            request: {},
            outgoingMessage: outgoing
          });

          setTimeout(function() {
            mockedOutgoing.verify();
            done();
          }, 5);
        });

        describe('the returned promise', function() {
          it('is rejected', function() {
            mockedStream.object.once.yieldsAsync(sentinels.foo);
            var p = handler._writeResponse(Promise.from({
              stream: mockedStream.object
            }), {
              request: {},
              outgoingMessage: outgoing
            });

            return assert.isRejected(p, sentinels.Sentinel);
          });
        });
      });

      describe('and the outgoing message emits `finish`', function() {
        it('removes the `error` listener', function(done) {
          mockedStream.expects('removeListener').once()
            .withExactArgs('error', sinon.match(function(listener) {
              return listener === mockedStream.object.once.firstCall.args[1];
            }));

          handler._writeResponse(
            Promise.from({ stream: mockedStream.object }),
            { request: {}, outgoingMessage: outgoing });


          setTimeout(function() {
            outgoing.emitFinish();
            mockedStream.verify();
            done();
          }, 5);
        });
      });

      describe('and the returned promise is cancelled', function() {
        it('removes the `error` listener', function(done) {
          mockedStream.expects('removeListener').once()
            .withExactArgs('error', sinon.match(function(listener) {
              return listener === mockedStream.object.once.firstCall.args[1];
            }));

          var p = handler._writeResponse(
            Promise.from({ stream: mockedStream.object }),
            { request: {}, outgoingMessage: outgoing });


          setTimeout(function() {
            p.cancel();
            mockedStream.verify();
            done();
          }, 5);
        });
      });
    });

    describe('the outgoing message emits `finish`', function() {
      describe('the returned promise', function() {
        it('is fulfilled', function() {
          var p = handler._writeResponse(
            Promise.from({}),
            { request: {}, outgoingMessage: outgoing });

          return assert.isFulfilled(delay().then(function() {
            outgoing.emitFinish();
            return p;
          }));
        });
      });
    });

    describe('the returned promise', function() {
      describe('is cancelled', function() {
        it('removes the `finish` listener', function(done) {
          var once = sinon.spy(outgoing, 'once');
          mockedOutgoing.expects('removeListener').once()
            .withExactArgs('finish', sinon.match(function(listener) {
              return listener === once.firstCall.args[1];
            }));

          var p = handler._writeResponse(
            Promise.from({}),
            { request: {}, outgoingMessage: outgoing });

          setTimeout(function() {
            p.cancel();
            mockedOutgoing.verify();
            done();
          }, 5);
        });
      });
    });
  });
});
