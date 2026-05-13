// Server-only GpsGate client.
// Hosted GpsGate (e.g. procrud.gpsgate.com) does not expose a REST endpoint
// to exchange a username/password for a token — the REST API only accepts
// pre-generated API keys. So we authenticate via the same JSON-RPC endpoint
// that the GpsGate web login uses: /comGpsGate/rpc/Directory/v.1 -> Login.

function getBaseUrl(): string {
  const raw = process.env.GPSGATE_BASE_URL ?? "https://procrud.gpsgate.com";
  const trimmed = raw.trim().replace(/\/$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export interface GpsGateUser {
  id: number | string;
  name?: string;
  email?: string;
  username?: string;
}

export interface GpsGateAuthResult {
  token: string;
  user: GpsGateUser;
}

interface RpcSession {
  UserId?: number;
  UserName?: string;
  UserDisplayName?: string;
  UserEmail?: string;
}

interface RpcEnvelope {
  id?: number;
  error?: { message?: string; errors?: Array<{ name?: string; message?: string }> };
  result?: {
    result?: {
      Session?: RpcSession;
      Server?: { Token?: string };
    };
  };
}

// GpsGate's RPC response embeds `new Date(123)` literals which are not valid
// JSON. Strip them to numbers before parsing.
function parseRpcBody(text: string): RpcEnvelope {
  const safe = text.replace(/new Date\((-?\d+)\)/g, "$1");
  return JSON.parse(safe) as RpcEnvelope;
}

export async function authenticateWithGpsGate(
  username: string,
  password: string,
): Promise<GpsGateAuthResult> {
  const base = getBaseUrl();

  const res = await fetch(`${base}/comGpsGate/rpc/Directory/v.1`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      method: "Login",
      params: {
        strUserName: username,
        strPassword: password,
        bStaySignedIn: false,
        sixDigitCode: "",
        rememberMe2FA: false,
        oneTimePasscode: "",
        temporaryLoginCode: "",
      },
      id: 1,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GpsGate RPC failed [${res.status}]: ${text.slice(0, 200)}`);
  }

  const text = await res.text();
  let payload: RpcEnvelope;
  try {
    payload = parseRpcBody(text);
  } catch {
    throw new Error("GpsGate returned an unparseable response");
  }

  if (payload.error) {
    const msg = payload.error.message ?? "";
    const isAuth =
      /wrong username or password|authentication/i.test(msg) ||
      payload.error.errors?.some((e) => e.name === "AuthenticationException");
    if (isAuth) throw new Error("INVALID_CREDENTIALS");
    throw new Error(`GpsGate login error: ${msg || "unknown"}`);
  }

  const session = payload.result?.result?.Session;
  const token = payload.result?.result?.Server?.Token;
  if (!session?.UserId || !token) {
    throw new Error("GpsGate did not return a session");
  }

  return {
    token,
    user: {
      id: session.UserId,
      username: session.UserName ?? username,
      email: session.UserEmail,
      name: session.UserDisplayName,
    },
  };
}

/**
 * Returns the GpsGate dashboard URL.
 * When a session token is provided it is appended as the `token` query
 * parameter so GpsGate lands the user in an already-authenticated session
