'use strict';

var chunkifyForm = require('../../lib/_chunkifyForm');

describe('Form chunkifier:', function() {
  describe('the form object', function() {
    describe('contains a property with an empty name', function() {
      it('throws a `TypeError`', function() {
        assert.throws(function() {
          chunkifyForm({ '': true });
        }, TypeError, 'Unexpected empty form param.');
      });
    });

    [
      { desc: 'an object', value: {} },
      { desc: '`null`', value: null },
      { desc: '`undefined`', value: undefined },
      { desc: 'non-finite numbers', value: Infinity }
    ].forEach(function(subject) {
      describe('contains ' + subject.desc, function() {
        it('throws a `TypeError`', function() {
          assert.throws(function() {
            chunkifyForm({ foo: subject.value });
          }, TypeError, 'Unexpected value for `foo` form param.');
        });
      });
    });
  });

  it('returns a buffer with encoded pairs', function() {
    var buffer = chunkifyForm({ 'foo': 'bar', 'bäz': 'qüx' });
    assert.isTrue(Buffer.isBuffer(buffer));
    assert.equal(buffer.toString('utf8'), 'foo=bar&b%C3%A4z=q%C3%BCx');
  });
});
