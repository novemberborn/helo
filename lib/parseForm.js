'use strict';

var querystring = require('querystring');

// # parseForm(string)

// Parses the string, assuming a content type of
// `application/x-www-form-urlencoded`. Returns an object with parameters and
// their values. Only contains string values. If parameters are repeated the
// last value is used.
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
