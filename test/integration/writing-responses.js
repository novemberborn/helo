'use strict';

var sinon = require('sinon');
var StreamArray = require('stream-array');

var Stack = require('../../').Stack;

describe('Writing responses to the outgoing message:', function() {
  var server, incoming, outgoing, mockedOutgoing;
  var responder, stack;
  var headers;
  beforeEach(function() {
    server = new stubs.Server();
    incoming = new stubs.IncomingMessage();
    outgoing = new stubs.OutgoingMessage();
    mockedOutgoing = sinon.mock(outgoing);

    responder = sinon.stub();
    stack = new Stack().finalize(responder).observe(server);

    headers = new sentinels.Sentinel('headers');
  });

  function that(description, response, expectations) {
    it(description, function(done) {
      var assertions;
      if (expectations) {
        assertions = expectations.call(mockedOutgoing);
      }
      responder.returns(
        typeof response === 'function' ? response() : response);

      stack.on('internalError', function(state, error) {
        done(error);
      });
      server.emitRequest(incoming, outgoing);

      setTimeout(function() {
        mockedOutgoing.verify();
        if (assertions) {
          assertions();
        }
        done();
      }, 5);
    });
  }

  describe('response has no `statusCode`, `headers` or a body', function() {
    that('only writes a `200` status code',
      {},
      function() {
        this.expects('setHeader').never();
        this.expects('writeHead').once().withExactArgs(200, undefined);
        this.expects('write').never();
        this.expects('end').once().withExactArgs();
      });
  });

  describe('response only has `statusCode`', function() {
    that('writes the status code',
      { statusCode: 400 },
      function() {
        this.expects('setHeader').never();
        this.expects('writeHead').once().withExactArgs(400, undefined);
        this.expects('write').never();
        this.expects('end').once().withExactArgs();
      });
  });

  describe('response only has `headers`', function() {
    that('writes a `200` status code and the headers',
      function() { return { headers: headers }; },
      function() {
        this.expects('setHeader').never();
        this.expects('writeHead').once().withExactArgs(200, headers);
        this.expects('write').never();
        this.expects('end').once().withExactArgs();
      });
  });

  describe('response has `statusCode` and `headers`', function() {
    that('writes the status code and the headers',
      function() { return { statusCode: 400, headers: headers }; },
      function() {
        this.expects('setHeader').never();
        this.expects('writeHead').once().withExactArgs(400, headers);
        this.expects('write').never();
        this.expects('end').once().withExactArgs();
      });
  });

  describe('response has `headers`', function() {
    describe('`_alreadySent` property', function() {
      that('is set',
        function() { return { headers: headers }; },
        function() {
          return function() {
            assert.property(headers, '_alreadySent');
          };
        });

      that('is not enumerable',
        function() { return { headers: headers }; },
        function() {
          return function() {
            assert.notInclude(Object.keys(headers), '_alreadySent');
          };
        });
    });
  });

  describe('response has `stream`', function() {
    var chunks;
    beforeEach(function() {
      chunks = sentinels.stubArray();
    });

    that('pipes the stream to the outgoing message',
      function() { return { stream: new StreamArray(chunks.slice()) }; },
      function() {
        this.expects('setHeader').never();
        this.expects('writeHead').once().withExactArgs(200, undefined);
        this.expects('write').once().withExactArgs(chunks[0]);
        this.expects('write').once().withExactArgs(chunks[1]);
        this.expects('write').once().withExactArgs(chunks[2]);
        this.expects('end').once();
      });
  });

  describe('response has `chunk`', function() {
    var chunk;
    beforeEach(function() {
      chunk = new Buffer('foo');
    });

    that('ends the outgoing message with the chunk',
      function() { return { chunk: chunk }; },
      function() {
        this.expects('setHeader').never();
        this.expects('writeHead').once().withExactArgs(200, undefined);
        this.expects('write').never();
        this.expects('end').once().withExactArgs(chunk);
      });
  });

  describe('response has `html`', function() {
    describe('`html` is a string', function() {
      that('ends the outgoing message with a buffer',
        function() { return { html: 'foo' }; },
        function() {
          var setHeader = this.expects('setHeader').once()
            .withExactArgs('content-type', stack.contentTypes.html);
          var writeHead = this.expects('writeHead').once()
            .withExactArgs(200, undefined);
          this.expects('write').never();
          this.expects('end').once().withExactArgs(sinon.match(function(arg) {
            return Buffer.isBuffer(arg) && arg.toString('utf8') === 'foo';
          }));

          return function() {
            assert.callOrder(setHeader, writeHead);
          };
        });
    });

    describe('`html` is an array', function() {
      var pieces;
      beforeEach(function() {
        pieces = ['foo', new Buffer('bar')];
      });

      that('writes each item to the outgoing message, then ends',
        function() { return { html: pieces }; },
        function() {
          var setHeader = this.expects('setHeader').once()
            .withExactArgs('content-type', stack.contentTypes.html);
          var writeHead = this.expects('writeHead').once()
            .withExactArgs(200, undefined);
          this.expects('write').once().withExactArgs('foo', 'utf8');
          this.expects('write').once().withExactArgs(sinon.match(function(arg) {
            return Buffer.isBuffer(arg) && arg.toString('utf8') === 'bar';
          }), 'utf8');
          this.expects('end').once().withExactArgs();

          return function() {
            assert.callOrder(setHeader, writeHead);
          };
        });
    });

    describe('the configured content-type', function() {
      beforeEach(function() {
        stack.contentTypes.html = sentinels.foo;
      });

      that('is set on the outgoing message',
        { html: '' },
        function() {
          this.expects('setHeader').once()
            .withExactArgs('content-type', sentinels.foo);
        });
    });

    describe('any specified content-type', function() {
      that('is written to the outgoing message',
        { headers: { 'content-type': 'foo' }, html: '' },
        function() {
          this.expects('writeHead').once().withExactArgs(200, sinon.match({
            'content-type': 'foo'
          }));
        });
    });
  });

  describe('response has `json`', function() {
    that('ends the outgoing message with a string representation',
      function() { return { json: { foo: 'bar' } }; },
      function() {
        var setHeader = this.expects('setHeader').once()
          .withExactArgs('content-type', stack.contentTypes.json);
        var writeHead = this.expects('writeHead').once()
          .withExactArgs(200, undefined);
        this.expects('end').once().withExactArgs(sinon.match(function(arg) {
          return Buffer.isBuffer(arg) &&
            arg.toString('utf8') === '{"foo":"bar"}';
        }));

        return function() {
          assert.callOrder(setHeader, writeHead);
        };
      });

    describe('the configured content-type', function() {
      beforeEach(function() {
        stack.contentTypes.json = sentinels.foo;
      });

      that('is set on the outgoing message',
        { json: {} },
        function() {
          this.expects('setHeader').once()
            .withExactArgs('content-type', sentinels.foo);
        });
    });

    describe('any specified content-type', function() {
      that('is written to the outgoing message',
        { headers: { 'content-type': 'foo' }, json: {} },
        function() {
          this.expects('writeHead').once().withExactArgs(200, sinon.match({
            'content-type': 'foo'
          }));
        });
    });

    describe('the configured chunkifier', function() {
      var chunk, chunkify;
      beforeEach(function() {
        chunk = new Buffer('foo');
        chunkify = sinon.stub(stack.chunkifiers, 'json').returns(chunk);
      });

      that('is used to determine what to write to the outgoing message',
        function() { return { json: sentinels.foo }; },
        function() {
          this.expects('end').once().withExactArgs(chunk);

          return function() {
            assert.calledWithExactly(chunkify, sentinels.foo);
          };
        });
    });
  });

  describe('response has `form`', function() {
    that('ends the outgoing message with a string representation',
      function() { return { form: { foo: 'bar' } }; },
      function() {
        var setHeader = this.expects('setHeader').once()
          .withExactArgs('content-type', stack.contentTypes.form);
        var writeHead = this.expects('writeHead').once()
          .withExactArgs(200, undefined);
        this.expects('end').once().withExactArgs(sinon.match(function(arg) {
          return Buffer.isBuffer(arg) && arg.toString('utf8') === 'foo=bar';
        }));

        return function() {
          assert.callOrder(setHeader, writeHead);
        };
      });

    describe('the configured content-type', function() {
      beforeEach(function() {
        stack.contentTypes.form = sentinels.foo;
      });

      that('is set on the outgoing message',
        { form: {} },
        function() {
          this.expects('setHeader').once()
            .withExactArgs('content-type', sentinels.foo);
        });
    });

    describe('any specified content-type', function() {
      that('is written to the outgoing message',
        { headers: { 'content-type': 'foo' }, form: {} },
        function() {
          this.expects('writeHead').once().withExactArgs(200, sinon.match({
            'content-type': 'foo'
          }));
        });
    });

    describe('the configured chunkifier', function() {
      var chunk, chunkify;
      beforeEach(function() {
        chunk = new Buffer('foo');
        chunkify = sinon.stub(stack.chunkifiers, 'form').returns(chunk);
      });

      that('is used to determine what to write to the outgoing message',
        function() { return { form: sentinels.foo }; },
        function() {
          this.expects('end').once().withExactArgs(chunk);

          return function() {
            assert.calledWithExactly(chunkify, sentinels.foo);
          };
        });
    });
  });
});
