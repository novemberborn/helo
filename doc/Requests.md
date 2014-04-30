# Requests

Middleware and responders are called with a request object. This is *not* an
[`IncomingMessage`](http://nodejs.org/api/http.html#http_http_incomingmessage),
but an object created by Helo. Each stack has its own subclass.

Use [`isRequest()`](./lib/isRequest.js.html) to see if a particular object is a
request originating from Helo.

## Properties

* `incomingMessage`: the incoming message, from Node itself.
* `method`: the request method, e.g. `GET`.
* `headers`: the request headers.
* `host`: specifically the `host` header.
* `path`: the path section of the [request
 target](http://tools.ietf.org/html/draft-ietf-httpbis-p1-messaging#section-5.3).
* `pathname`: the section of the path before the query.
* `querystring`: the query section of the path, as a string.
* `stream`: except for `GET`, `DELETE` and `HEAD` requests, the incoming
message, otherwise `null`.
* `query`: an object, representing the result of parsing the `querystring`. Only
contains string values. If parameters are repeated the last value is used.
