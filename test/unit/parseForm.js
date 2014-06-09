'use strict';

var querystring = require('querystring');

var sinon = require('sinon');

var parseForm = require('../../lib/parseForm');

describe('Form parser:', function() {
  var parseSpy;
  beforeEach(function() {
    parseSpy = sinon.spy(querystring, 'parse');
  });
  afterEach(function() {
    parseSpy.restore();
  });

  it('returns an object', function() {
    assert.deepEqual(parseForm('foo=bar&baz=qux'), {
      foo: 'bar',
      baz: 'qux'
    });
  });

  it('uses `querystring.parse()`', function() {
    var str = 'foo=bar&baz=qux';
    var result = parseForm(str);

    assert.calledOnce(parseSpy);
    assert.calledWithExactly(parseSpy, str);
    assert.strictEqual(result, parseSpy.firstCall.returnValue);
  });

  describe('a parameter occurs multiple times', function() {
    describe('the result', function() {
      it('only contains the last value', function() {
        assert.propertyVal(parseForm('bar=baz&bar=qux'), 'bar', 'qux');
      });
    });
  });
});
