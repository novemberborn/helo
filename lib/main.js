'use strict';

// # main

// ## Stack

// Creates a request handling stack. [Read more](./Stack.js.html).
exports.Stack = require('./Stack');

// ## isRequest(obj)

// Checks whether `obj` is a request originating from Helo. [Read
// more](./isRequest.js.html).
exports.isRequest = require('./isRequest');

// ## parseForm(string)

// Parses the string, assuming a content type of
// `application/x-www-form-urlencoded`. [Read
// more](./parseForm.js.html).
exports.parseForm = require('./parseForm');
