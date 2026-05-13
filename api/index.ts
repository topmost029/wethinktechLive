// Vercel Node serverless entry. Adapts Node's IncomingMessage/ServerResponse
// to the Web Fetch Request/Response that the TanStack Start SSR handler in
// ../src/server.ts expects.
import type { IncomingMessage, ServerResponse } from "node:http";
// @ts-expect-error - resolved at runtime from the built SSR bundle
import handler from "../dist/server/server.js";

function buildRequest(req: IncomingMessage): Request {
  const host = req.headers.host ?? "localhost";
  const protocol =
    (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0] ?? "https";
  const url = new URL(req.url ?? "/", `${protocol}://${host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    else if (typeof value === "string") headers.set(key, value);
  }

  const method = req.method ?? "GET";
  const init: RequestInit = { method, headers };
  if (method !== "GET" && method !== "HEAD") {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        req.on("data", (chunk) =>
          controller.enqueue(
            chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk),
          ),
        );
        req.on("end", () => controller.close());
        req.on("error", (err) => controller.error(err));
      },
    });
    init.body = body;
    // @ts-expect-error - undici-specific option needed for streamed bodies
    init.duplex = "half";
  }
  return new Request(url.toString(), init);
}

async function writeResponse(res: ServerResponse, response: Response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (!response.body) {
    res.end();
    return;
  }
  const reader = response.body.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}

export default async function vercelHandler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  try {
    const request = buildRequest(req);
    const response = await (handler as { fetch: (r: Request) => Promise<Response> }).fetch(
      request,
    );
    await writeResponse(res, response);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Internal Server Error");
  }
}
