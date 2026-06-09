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
  const abort = () => {
    if (!ac.signal.aborted) ac.abort();
  };
  req.on("close", abort);
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
    if (!isDisconnect(err)) {
      console.error("[stream] pipe error", err);
    }
    if (!res.writableEnded && !res.destroyed) res.destroy();
  }
}

function asErr(value: unknown): Error & { code?: string; cause?: unknown } {
  return value as Error & { code?: string; cause?: unknown };
}

/** True when the error is just the client/upstream hanging up, not a real fault. */
export function isDisconnect(err: unknown): boolean {
  let current: unknown = err;
  while (current) {
    const e = asErr(current);
    const code = e.code;
    const name = e.name;
    const message = e.message ?? "";
    if (
      name === "AbortError" ||
      code === "UND_ERR_SOCKET" ||
      code === "UND_ERR_ABORTED" ||
      code === "ERR_STREAM_PREMATURE_CLOSE" ||
      code === "ECONNRESET" ||
      message === "terminated" ||
      message.includes("other side closed")
    ) {
      return true;
    }
    current = e.cause;
  }
  return false;
}
