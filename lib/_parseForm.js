'use strict';

var querystring = require('querystring');

function parseForm(string) {
  var parsed = querystring.parse(string);
  Object.keys(parsed).forEach(function(key) {
    var value = parsed[key];
    if (Array.isArray(value)) {
      parsed[key] = value.pop();
    }
  });
  return parsed;
}

module.exports = parseForm;
