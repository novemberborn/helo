'use strict';

function chunkifyForm(form) {
  var pairs = Object.keys(form).reduce(function(pairs, param) {
    if (!param) {
      throw new TypeError('Unexpected empty form param.');
    }

    var value = form[param];

    if (typeof value === 'string' ||
        typeof value === 'number' && isFinite(value) ||
        typeof value === 'boolean') {
      pairs.push(
        encodeURIComponent(param) + '=' + encodeURIComponent(value + ''));
      return pairs;
    }

    throw new TypeError('Unexpected value for `' + param + '` form param.');
  }, []);

  return new Buffer(pairs.join('&'), 'utf8');
}

module.exports = chunkifyForm;
