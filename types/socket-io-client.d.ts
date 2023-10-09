/**
 * This is temporary workaround.
 *
 * `@types/node` doesn't expose `TransformStream` in global scope as it should
 * which breaks `engine.io-parser` package that is dependency of `socket.io-client`
 *
 * @see https://github.com/socketio/engine.io-parser/issues/136
 */
import { TransformStream as TS } from "node:stream/web";

declare global {
  type TransformStream<I = any, O = any> = TS<I, O>;
}
