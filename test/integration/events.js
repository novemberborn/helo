'use strict';

var sinon = require('sinon');

var Stack = require('../../').Stack;

describe('Events', function() {
  var server, incoming, outgoing;
  var responder, stack;
  var events;
  beforeEach(function() {
    server = new stubs.Server();
    incoming = new stubs.IncomingMessage();
    outgoing = new stubs.OutgoingMessage();

    responder = sinon.stub();
    stack = new Stack().finalize(responder).observe(server);

    events = sinon.mock({
      request: function() {},
      cancelError: function() {},
      timeoutError: function() {},
      internalError: function() {},
      response: function() {},
      streamingError: function() {},
      streamObservationFailed: function() {},
      responseFinish: function() {},
      responseCancel: function() {}
    });

    // Rewrite emit() so the events are easier to assert.
    stack.emit = function(type) {
      events.object[type].apply(events.object, [].slice.call(arguments, 1));
    };
  });

  function matchState(response, streaming) {
    return sinon.match({
      incomingMessage: incoming,
      outgoingMessage: outgoing,
      request: sinon.match.instanceOf(stack.Request),
      response: response ? sinon.match.same(response) : null,
      streaming: streaming || false
    });
  }

  function isEmitted(event, message, setup) {
    describe('`' + event + '`', function() {
      it('is emitted ' + message, function(done) {
        var assertions = setup();
        server.emitRequest(incoming, outgoing);

        setTimeout(function() {
          events.verify();
          if (assertions) {
            assertions();
          }
          done();
        }, 5);
      });
    });
  }

  isEmitted(
    'request', 'after a request is instantiated, before `responder` is called',
    function() {
      var emitted = events.expects('request').once()
        .withExactArgs(matchState());

      return function() {
        assert.callOrder(emitted, responder);
      };
    });

  isEmitted(
    'cancelError', 'after a response fails with a `cancel` error',
    function() {
      var error = new sentinels.Sentinel({
        name: { value: 'cancel' }
      });
      responder.throws(error);
      events.expects('cancelError').once().withExactArgs(matchState(), error);
    });

  isEmitted(
    'timeoutError', 'after a response fails with a `timeout` error',
    function() {
      var error = new sentinels.Sentinel({
        name: { value: 'timeout' }
      });
      responder.throws(error);
      events.expects('timeoutError').once().withExactArgs(matchState(), error);
    });

  isEmitted(
    'internalError', 'after a response fails with any other error',
    function() {
      responder.throws(sentinels.foo);
      events.expects('internalError').once()
        .withExactArgs(matchState(), sentinels.foo);
    });

  isEmitted(
    'response', 'before the response is written',
    function() {
      responder.returns(sentinels.foo);

      var writeHead = sinon.spy(outgoing, 'writeHead');
      var emitted = events.expects('response').once()
        .withExactArgs(matchState(sentinels.foo));

      return function() {
        assert.callOrder(emitted, writeHead);
      };
    });

  isEmitted(
    'streamingError', 'when the response stream emits `error`',
    function() {
      var stream = new stubs.Stream();
      sinon.stub(stream, 'once').yieldsAsync(sentinels.foo);

      var response = { stream: stream };
      responder.returns(response);

      events.expects('streamingError').once()
        .withExactArgs(matchState(response, true), sentinels.foo);
    });

  isEmitted(
    'streamObservationFailed', 'when observing the response stream throws',
    function() {
      var stream = new stubs.Stream();
      sinon.stub(stream, 'once').throws(sentinels.foo);

      var response = { stream: stream };
      responder.returns(response);

      events.expects('streamObservationFailed').once()
        .withExactArgs(matchState(response, true), sentinels.foo);
    });

  isEmitted(
    'responseFinish', 'when the outgoing message emits `finish`',
    function() {
      var response = { statusCode: 204 };
      responder.returns(response);

      outgoing.end = function() {
        process.nextTick(outgoing.emitFinish);
      };

      events.expects('responseFinish').once()
        .withExactArgs(matchState(response));
    });

  isEmitted(
    'responseCancel', 'when the outgoing message emits `close`',
    function() {
      var response = { statusCode: 204 };
      responder.returns(response);

      outgoing.end = function() {
        process.nextTick(outgoing.emitClose);
      };

      events.expects('responseCancel').once()
        .withExactArgs(matchState(response));
    });
});
