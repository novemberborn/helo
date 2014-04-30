'use strict';

var sinon = require('sinon');
var CancellationError = require('legendary').CancellationError;
var TimeoutError = require('legendary').TimeoutError;

var Stack = require('../../').Stack;

describe('Defined error responses:', function() {
  var server, incoming, outgoing, mockedOutgoing;
  var stack, responder, headers, chunks;
  beforeEach(function() {
    server = new stubs.Server();
    incoming = new stubs.IncomingMessage();
    outgoing = new stubs.OutgoingMessage();
    mockedOutgoing = sinon.mock(outgoing);

    stack = new Stack();

    headers = {
      '500': new sentinels.Sentinel('500-response-headers'),
      '503': new sentinels.Sentinel('503-response-headers'),
      '504': new sentinels.Sentinel('504-response-headers')
    };
    chunks = {
      '500': new Buffer('500'),
      '503': new Buffer('503'),
      '504': new Buffer('504')
    };

    stack.setErrorResponse({
      statusCode: 500,
      headers: headers['500'],
      chunk: chunks['500']
    });
    stack.setErrorResponse({
      statusCode: 503,
      headers: headers['503'],
      chunk: chunks['503']
    });
    stack.setErrorResponse({
      statusCode: 504,
      headers: headers['504'],
      chunk: chunks['504']
    });


    responder = sinon.stub();
    stack.finalize(responder);
    stack.observe(server);
  });

  describe('are returned based on what error is thrown', function() {
    describe('a CancellationError is thrown', function() {
      it('results in the defined 503 response', function(done) {
        mockedOutgoing.expects('writeHead').once()
          .withExactArgs(503, headers['503']);
        mockedOutgoing.expects('end').once().withExactArgs(chunks['503']);

        responder.throws(new CancellationError());
        server.emitRequest(incoming, outgoing);

        setTimeout(function() {
          mockedOutgoing.verify();
          done();
        }, 5);
      });
    });

    describe('a TimeoutError is thrown', function() {
      it('results in the defined 504 response', function(done) {
        mockedOutgoing.expects('writeHead').once()
          .withExactArgs(504, headers['504']);
        mockedOutgoing.expects('end').once().withExactArgs(chunks['504']);

        responder.throws(new TimeoutError());
        server.emitRequest(incoming, outgoing);

        setTimeout(function() {
          mockedOutgoing.verify();
          done();
        }, 5);
      });
    });

    describe('anything else is thrown', function() {
      it('results in the defined 500 response', function(done) {
        mockedOutgoing.expects('writeHead').once()
          .withExactArgs(500, headers['500']);
        mockedOutgoing.expects('end').once().withExactArgs(chunks['500']);

        responder.throws(null);
        server.emitRequest(incoming, outgoing);

        setTimeout(function() {
          mockedOutgoing.verify();
          done();
        }, 5);
      });
    });

    describe('Stack#setErrorResponse() is called twice for the same error',
      function() {
        it('results in the last response', function(done) {
          var headers = new sentinels.Sentinel();
          var chunk = new Buffer('foo');

          stack.setErrorResponse({
            statusCode: 500,
            headers: headers,
            chunk: chunk
          });

          mockedOutgoing.expects('writeHead').once()
            .withExactArgs(500, headers);
          mockedOutgoing.expects('end').once().withExactArgs(chunk);

          responder.throws(null);
          server.emitRequest(incoming, outgoing);

          setTimeout(function() {
            mockedOutgoing.verify();
            done();
          }, 5);
        });
      });
  });
});
