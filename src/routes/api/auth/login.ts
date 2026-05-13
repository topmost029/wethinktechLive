import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateWithGpsGate } from "@/lib/gpsgate.server";

const LoginSchema = z.object({
  username: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(255),
});

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = LoginSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid input", details: parsed.error.flatten() },
            { status: 400 },
          );
        }

        try {
          // Validate credentials against GpsGate. We don't forward the token —
          // the browser will POST directly to GpsGate's public/login endpoint
          // so GpsGate can set its own session cookie.
          const { user } = await authenticateWithGpsGate(
            parsed.data.username,
            parsed.data.password,
          );

          return Response.json({
            verified: true,
            user: {
              id: user.id,
              username: user.username ?? parsed.data.username,
              email: user.email ?? null,
              name: user.name ?? null,
            },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          if (msg === "INVALID_CREDENTIALS") {
            return Response.json(
              { error: "Invalid username or password" },
              { status: 401 },
            );
          }
          console.error("Login error:", msg);
          return Response.json(
            { error: "Authentication service unavailable" },
            { status: 502 },
          );
        }
      },
    },
  },
});
