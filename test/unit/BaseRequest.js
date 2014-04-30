'use strict';

var querystring = require('querystring');

var sinon = require('sinon');

var BaseRequest = require('../../lib/_BaseRequest');

describe('BaseRequest(incomingMessage)', function() {
  var incoming, request;
  beforeEach(function() {
    incoming = new stubs.IncomingMessage(
      null, null, 'http://example.com/pathname?query');
    request = new BaseRequest(incoming);
  });

  describe('#incomingMessage', function() {
    it('is `incomingMessage`', function() {
      assert.matchingSentinels(request.incomingMessage, incoming);
    });
  });

  describe('#method', function() {
    it('is `incomingMessage.method`', function() {
      assert.matchingSentinels(request.method, incoming.method);
    });
  });

  describe('#headers', function() {
    it('is `incomingMessage.headers`', function() {
      assert.matchingSentinels(request.headers, incoming.headers);
    });
  });

  describe('#host', function() {
    it('is `incomingMessage.headers.host`', function() {
      assert.matchingSentinels(request.host, incoming.headers.host);
    });
  });

  describe('#path', function() {
    it('is derived from `incomingMessage.url`', function() {
      assert.equal(request.path, '/pathname?query');
    });
  });

  describe('#pathname', function() {
    it('is derived from `incomingMessage.url`', function() {
      assert.equal(request.pathname, '/pathname');
    });
  });

  describe('#querystring', function() {
    it('is derived from `incomingMessage.url`', function() {
      assert.equal(request.querystring, 'query');
    });
  });

  describe('#stream', function() {
    ['GET', 'DELETE', 'HEAD'].forEach(function(method) {
      describe('for a ' + method + ' request', function() {
        var incoming, request;
        beforeEach(function() {
          incoming = new stubs.IncomingMessage(null, method);
          request = new BaseRequest(incoming);
        });

        it('is `null`', function() {
          assert.isNull(request.stream);
        });
      });
    });

    describe('other methods', function() {
      it('is `incomingMessage`', function() {
        assert.matchingSentinels(request.stream, incoming);
      });
    });
  });

  describe('#query', function() {
    var parseSpy;
    beforeEach(function() {
      parseSpy = sinon.spy(querystring, 'parse');
    });
    afterEach(function() {
      parseSpy.restore();
    });

    it('is an object', function() {
      assert.isObject(request.query);
    });

    it('is parsed through `querystring.parse()`', function() {
      var request = new BaseRequest(incoming);
      var query = request.query;

      assert.calledOnce(parseSpy);
      assert.calledWithExactly(parseSpy, request.querystring);
      assert.strictEqual(query, parseSpy.firstCall.returnValue);
    });

    describe('a parameter occurs multiple times', function() {
      describe('#query', function() {
        it('only contains the last value', function() {
          var request = new BaseRequest(
            new stubs.IncomingMessage(null, null, '/foo?bar=baz&bar=qux'));
          assert.propertyVal(request.query, 'bar', 'qux');
        });
      });
    });
  });
});
