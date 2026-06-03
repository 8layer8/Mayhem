import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { Request, Response } from "express";

/**
 * Returns an AbortSignal that fires when the client connection closes, so we
 * stop reading from (and tear down our request to) Plex once the browser has
 * gone away — e.g. when an <audio> element seeks and opens a fresh Range
 * request, abandoning the previous one.
 */
export function abortOnClose(req: Request, res: Response): AbortSignal {
  const ac = new AbortController();
  const abort = () => ac.abort();
  res.once("close", abort);
  return ac.signal;
}

/**
 * Safely pipe an undici fetch body (a web ReadableStream) to the Express
 * response. A browser seeking or closing an <audio> element tears down the
 * upstream socket mid-stream ("other side closed"); piping with `.pipe()`
 * leaves that 'error' event unhandled, which crashes the whole process.
 * pipeline() surfaces it as a rejected promise we can swallow instead.
 */
export async function pipeUpstreamBody(
  body: ReadableStream,
  res: Response,
): Promise<void> {
  try {
    await pipeline(Readable.fromWeb(body as never), res);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    const name = (err as Error)?.name;
    // Client disconnect / upstream reset is routine for media streams.
    if (
      code !== "ERR_STREAM_PREMATURE_CLOSE" &&
      code !== "UND_ERR_SOCKET" &&
      name !== "AbortError"
    ) {
      console.error("[stream] pipe error", err);
    }
    if (!res.writableEnded) res.destroy();
  }
}

/** True when the error is just the client/upstream hanging up, not a real fault. */
export function isDisconnect(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException)?.code;
  const name = (err as Error)?.name;
  return (
    name === "AbortError" ||
    code === "UND_ERR_SOCKET" ||
    code === "ERR_STREAM_PREMATURE_CLOSE"
  );
}
