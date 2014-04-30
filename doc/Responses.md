# Responses

Response objects can contain the following properties:

* `statusCode`
* `headers`
* `stream`
* `chunk`
* `html`
* `json`
* `form`

These should be own-properties of the object.

## Head

### `statusCode`

Defaults to `200` if not set. Otherwise must be a finite number.

### `headers`

Optional object containing the headers to be written to the outgoing message.
Each own-property is considered as a header. Header names must not
case-insensitively equal other names on the same object, nor can they be the
empty string.

Values can be strings, finite numbers, and booleans. They'll be cast to strings
if necessary. Values may be arrays, in which case each item will still need to
be a string, finite number, or boolean. Again they'll be cast to strings if
necessary. Array values are not allowed to include other arrays.

The `headers` object can only be sent *once*. If the same object is included in
multiple responses an error will be thrown.

## Body

The response body is determined by `stream`, `chunk`, `html`, `json` or `form`.
Only one of these properties can be present.

No body is allowed for `HEAD` requests, and responses with status codes `204`,
`304` and any code in the `1xx` range. An error will be thrown if a body is
returned regardless.

### `stream`

Should contain an object with a `pipe()` method, to pipe data to the outgoing
message.

### `chunk`

Should contain a `Buffer` containing the bytes to be written.

### `html`

Should contain either a string, or an array containing strings or `Buffer`s. The
data is written using `utf8` encoding.

If no `content-type` header is set, the type configured in the stack will be
used.

### `json`

Should contain a value that can be serialized as JSON. Note that `undefined`
values cause an error to be thrown, but other values which might not serialize
will not.

The serialization implementation can be configured in the stack.

If no `content-type` header is set, the type configured in the stack will be
used.

### `form`

Should contain a value that can be serialized as a URL-encoded string. Note that
non-object values cause an error to be thrown.

The default serialization implementation, as configured in the stack, only
serializes own-properties. Empty property names cause an error to be thrown.
Values can be strings, finite numbers, and booleans.

If no `content-type` header is set, the type configured in the stack will be
used.
