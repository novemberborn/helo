# Events

Events are emitted from the stack when new requests are made, errors occur, or
responses are written.

## State object

The first argument for every emitted event is a state object, with the
following properties:

* `incomingMessage`: The incoming message.
* `outgoingMessage`: The outgoing message.
* `request`: The request instantiated for the stack.
* `response`: The final response that's supposed to be written to the outgoing
message.
* `streaming`: Whether the response is being streamed to the outgoing message.

## `request` event

Emitted immediately after a request is instantiated.

## `cancelError` event

Emitted when the response promise is rejected with an error whose `name` is
`cancel`. The error is passed as the second argument.

## `timeoutError` event

Emitted when the response promise is rejected with an error whose `name` is
`timeout`. The error is passed as the second argument.

## `internalError` event

Emitted when the response promise is rejected with any other error. The error
is passed as the second argument.

## `response` event

Emitted just before the headers are written to the outgoing message.

## `responseFinish` event

Emitted when the outgoing message emits its `finish` event.

## `responseCancel` event

Emitted when the outgoing message emits its `close` event while the response is
being written.

## `streamingError` event

Emitted if errors occurred when piping the response stream. The error is passed
as the second argument.

## `streamObservationFailed` event

Emitted when listening for `error` events from the response stream throws an
error. The error is passed as the second argument.
