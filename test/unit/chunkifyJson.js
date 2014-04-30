'use strict';

var sinon = require('sinon');

var chunkifyJson = require('../../lib/_chunkifyJson');

describe('JSON chunkifier:', function() {
  var stringifyStub;
  beforeEach(function() {
    stringifyStub = sinon.stub(JSON, 'stringify').returns('foo');
  });
  afterEach(function() {
    stringifyStub.restore();
  });

  it('uses `JSON.stringify()`', function() {
    chunkifyJson(sentinels.foo);
    assert.calledWithExactly(stringifyStub, sentinels.foo);
  });

  it('returns a buffer', function() {
    var buffer = chunkifyJson();
    assert.isTrue(Buffer.isBuffer(buffer));
    assert.equal(buffer.toString('utf8'), 'foo');
  });
});
