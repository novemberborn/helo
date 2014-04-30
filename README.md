helo
====

Promise-based HTTP request handling stack.

## Installation

```
npm install legendary
npm install helo
```

This module has a peer dependency on
[Legendary](https://github.com/novemberborn/legendary).

## Usage

See [API Docs](http://novemberborn.github.io/helo/lib/main.js.html).

### Request handling

Helo handles requests a little differently than a standard Node HTTP server. To
see how, let's start with a standard example:

```js
function app(req, res) {
  setTimeout(function() {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<p>Hello world</p>');
  }, 2000);
}

var server = require('http').createServer(app);
server.listen(8080);
```

The application receives a `req` argument, the *incoming message*, and a
`res` argument, the *outgoing message*. It writes directly to the outgoing
message.

Here's Helo's equivalent:

```js
var delay = require('legendary').timed.delay;

function app(request) {
  return delay(2000).yield({
    statusCode: 200,
    html: '<p>Hello world</p>'
  });
}

var server = require('http').createServer();

require('helo').Stack()
  .finalize(app)
  .observe(server);

server.listen(8080);
```

#### Responses

The application does not receive the outgoing message, instead it's expected to
return a (promise for a) response object. This is then written to the outgoing
message by Helo. [Read more about the response
objects](http://novemberborn.github.io/helo/doc/Responses.md.html).

The promise is cancelled if the outgoing message is closed before the promise
has fulfilled. This allows the application to decide whether to continue
handling the request even though its response will never reach the end-user.

#### Requests

The request received by the application is a wrapper for the incoming message.
[Read more about the default request
properties](http://novemberborn.github.io/helo/doc/Requests.md.html).

Each stack has its own `Request` class. You can extend its prototype:

```js
var stack = require('helo').Stack();
stack.Request.prototype.metasyntactic = function() {
  return 'foo';
};
```

To add specific properties to the request, as it's instantiated, you can use
[`Stack#addRequestInitializer()`](http://novemberborn.github.io/helo/lib/Stack.js.html#stack-addrequestinitializer-initializer-):

```js
require('helo').Stack()
  .addRequestInitializer(function() {
    this.start = this.headers['x-request-start'];
  })
  .finalize(function(request) {
    return {
      statusCode: 200,
      html: ['<p>Received request at ', request.start, '</p>']
    };
  });
```

#### Middleware

[`Stack#addMiddleware()`](http://novemberborn.github.io/helo/lib/Stack.js.html#stack-addmiddleware-factory-)
can be used to set up a chain of functions that'll be invoked before the
request is passed to the application:

```js
function app(request) {
  return {
    statusCode: 200,
    html: '<p>Hello world</p>'
  };
}

require('helo').Stack()
  .addMiddleware(function(next) {
    return function(request) {
      if (Math.random() < 1/3) {
        return {
          statusCode: 200,
          html: '<p>Intercepted request before application was reached.</p>'
        };
      }

      return next(request);
    };
  })
  .addMiddleware(function(next) {
    return function(request) {
      return next(request).then(function(response) {
        if (Math.random() < 1/3) {
          return {
            statusCode: 200,
            html: '<p>Replaced application response.</p>'
          };
        }

        return response;
      });
    };
  })
  .finalize(app);
```

`next` will invoke the next middleware function or indeed the application. It
always returns a promise, albeit rejected if the function throws.

Middleware should *not* be used to set properties on the `request`. Use
request initializers instead.

#### Plugins

Plugins combine request initializers and middleware in a single object:

```js
require('helo').Stack()
  .install({
    requestInitializer: function() {},
    middleware: function(next) {
      return next;
    }
  });
```

#### Low-level error responses

A `503` response is generated when the response promise is rejected with an
error that has a `cancel` as its `name`. Similarly if the error has `timeout` as
its `name`, a `504` response is generated. For all other errors a `500` response
is used.

Normally these responses do not have headers or indeed a response body, but they
can be customized:

```js
require('helo').Stack()
  .setErrorResponse({
    statusCode: 500,
    headers: { 'content-type': 'text/html' },
    chunk: new Buffer('<p>An internal error occurred.</p>')
  })
  .setErrorResponse({
    statusCode: 503,
    headers: { 'content-type': 'text/html' },
    chunk: new Buffer('<p>Service unavailable.</p>')
  })
  .setErrorResponse({
    statusCode: 504,
    headers: { 'content-type': 'text/html' },
    chunk: new Buffer('<p>Service timed out.</p>')
  });
```

#### Lifecycle events

Events are emitted from the stack when new requests are made, errors occur, or
responses are written. [Read more about
events](http://novemberborn.github.io/helo/doc/Events.md.html).

#### And more!

See [API Docs](http://novemberborn.github.io/helo/lib/main.js.html).
