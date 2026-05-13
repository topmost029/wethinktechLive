import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, type FormEvent } from "react";
import { Loader2, ShieldCheck, MapPin, Activity, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Logo is served from /public. The SVG is always present; the PNG is optional.
const logo = "/wethinktech-logo.svg";

// GpsGate's official cross-site login endpoint (POST with username + password).
// It sets the session cookie and redirects the browser to the dashboard.
const GPSGATE_LOGIN_URL =
  (import.meta.env.VITE_GPSGATE_BASE_URL ?? "https://procrud.gpsgate.com").replace(/\/$/, "") +
  "/comGpsGate/public/login";

export const Route = createFileRoute("/")(({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in — WeThinkTech Fleet Console" },
      {
        name: "description",
        content: "Secure sign-in to the WeThinkTech Global Limited fleet dashboard.",
      },
    ],
  }),
} as Parameters<typeof createFileRoute<"/">>[0]));

interface VerifyResponse {
  verified: boolean;
  user: { id: string | number; username: string };
  error?: string;
}

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const gpsFormRef = useRef<HTMLFormElement>(null);
  const gpsUsernameRef = useRef<HTMLInputElement>(null);
  const gpsPasswordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Step 1: verify credentials server-side (avoids exposing wrong-password
      // attempts directly to GpsGate and lets us show a branded error).
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = (await res.json().catch(() => ({}))) as Partial<VerifyResponse>;

      if (!res.ok || !data.verified) {
        setError(data.error ?? "Sign-in failed. Please try again.");
        return;
      }

      // Step 2: credentials are valid — do a real browser form POST to GpsGate.
      // This lets GpsGate set its own session cookie and redirect to the dashboard.
      if (gpsUsernameRef.current) gpsUsernameRef.current.value = username;
      if (gpsPasswordRef.current) gpsPasswordRef.current.value = password;
      gpsFormRef.current?.submit();

      // Keep the spinner going while the browser navigates away.
    } catch {
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Hidden form that POSTs directly to GpsGate after verification */}
      <form
        ref={gpsFormRef}
        action={GPSGATE_LOGIN_URL}
        method="post"
        style={{ display: "none" }}
      >
        <input ref={gpsUsernameRef} type="text" name="username" defaultValue="" />
        <input ref={gpsPasswordRef} type="password" name="password" defaultValue="" />
      </form>

      {/* Ambient brand glow */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" />
      <div className="pointer-events-none absolute -top-48 -left-32 h-[520px] w-[520px] rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[460px] w-[460px] rounded-full bg-[oklch(0.78_0.18_95)]/15 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-2">
        {/* Left — brand panel */}
        <section className="hidden flex-col justify-between p-10 lg:flex">
          <div className="flex items-center">
            <img
              src={logo}
              alt="WeThinkTech Global Limited"
              className="h-14 w-auto drop-shadow-[0_4px_24px_rgba(60,200,120,0.25)]"
            />
          </div>

          <div className="space-y-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
                Fleet Intelligence
              </p>
              <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-foreground">
                Track every asset.
                <br />
                <span className="text-primary">In real time.</span>
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
                Sign in to the WeThinkTech operations console — live telemetry,
                geofencing, and driver insights powered by GpsGate.
              </p>
            </div>

            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Radio className="h-4 w-4" />
                </span>
                Live vehicle telemetry & alerts
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <MapPin className="h-4 w-4" />
                </span>
                Geofence and route monitoring
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Activity className="h-4 w-4" />
                </span>
                Driver behaviour & utilisation
              </li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} WeThinkTech Global Limited
          </p>
        </section>

        {/* Right — form */}
        <section className="flex items-center justify-center px-4 py-12 sm:px-8">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="mb-8 flex justify-center lg:hidden">
              <img
                src={logo}
                alt="WeThinkTech Global Limited"
                className="h-12 w-auto"
              />
            </div>

            <div className="rounded-2xl border border-border bg-card/80 p-8 shadow-elevated backdrop-blur">
              <h1 className="text-2xl font-semibold tracking-tight text-card-foreground">
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in with your GpsGate credentials to continue.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="username">Username or email</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    maxLength={255}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    maxLength={255}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading} size="lg">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>

              <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span>Secure server-side credential validation</span>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Trouble signing in? Contact your fleet administrator.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
