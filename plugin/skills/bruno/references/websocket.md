# WebSocket requests and Socket.IO servers

## A `type: ws` request

```bru
meta {
  name: News Feed
  type: ws
  seq: 1
}

ws {
  url: ws://localhost:3000/socket.io/?EIO=4&transport=websocket
  body: ws
  auth: none
}

body:ws {
  name: connect
  type: text
  content: '''
    40/news,
  '''
}

body:ws {
  name: subscribe
  type: text
  content: '''
    42/news,["subscribe",{"topic":"sports"}]
  '''
}
```

Each `body:ws { }` block is one message. This file parses with the CLI's own
parser; how the Bruno app sends the messages (order, timing) is **unverified**.

## `bru run` and WebSocket (bru 3.5.3)

`bru run` does not open WebSocket connections: a `type: ws` request goes
through its HTTP client, fails with `Unsupported protocol ws:`, and fails the
run. Tag WebSocket requests using the multi-line tag form described in
`references/capture.md` and run collections with `--exclude-tags ws`; send
them from the Bruno app (**unverified** here).

## Socket.IO framing

A Socket.IO server expects its own protocol frames, written by hand in each
`body:ws` message. Verified by sending these frames from a plain WebSocket
client to a socket.io 4 server (Engine.IO v4); answer the server's ping frame
`2` with `3` to stay connected.

| Frame | Meaning |
|---|---|
| URL `…/socket.io/?EIO=4&transport=websocket` | WebSocket transport, Engine.IO v4 |
| `40/news,` | connect to namespace `/news` |
| `42/news,["subscribe",{"topic":"sports"}]` | emit event `subscribe` |
| `42/news,7["subscribe",{"topic":"sports"}]` | emit with ack id `7`; the server answers `43/news,7[…]` |
| `44/news,{"message":"…"}` | the server refused the namespace connection |

- The default namespace `/` drops the `/<ns>,` part (`40`, `42["event",…]`).
  Every frame for any other namespace carries it, not only the connect frame.
- A token in the URL query (`?token=…`) is recorded wherever URLs are logged
  (server access logs, proxies). Prefer the connect frame's payload:
  `40/news,{"token":"{{authToken}}"}`, which the server reads as
  `socket.handshake.auth`.
