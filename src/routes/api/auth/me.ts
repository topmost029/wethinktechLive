import { createFileRoute } from "@tanstack/react-router";
import { extractBearer, verifySession } from "@/lib/jwt.server";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = extractBearer(request.headers.get("authorization"));
        if (!token) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        try {
          const session = verifySession(token);
          return Response.json({
            user: {
              id: session.sub,
              username: session.username ?? null,
              email: session.email ?? null,
              name: session.name ?? null,
            },
          });
        } catch {
          return Response.json({ error: "Invalid or expired token" }, { status: 401 });
        }
      },
    },
  },
});
