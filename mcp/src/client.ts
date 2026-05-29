const rawBase = process.env.ARTIFACT_HUB_BASE_URL ?? "http://localhost:3000";
export const baseUrl = rawBase.replace(/\/$/, "");
const apiKey = process.env.ARTIFACT_HUB_ADMIN_KEY ?? "";

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const msg = (err as Record<string, unknown>).error;
    throw new Error(typeof msg === "string" ? msg : `HTTP ${res.status}`);
  }

  return res.json();
}

export function get(path: string): Promise<unknown> {
  return request(path, { method: "GET" });
}

export function post(path: string, body: unknown): Promise<unknown> {
  return request(path, { method: "POST", body: JSON.stringify(body) });
}

export function patch(path: string, body: unknown): Promise<unknown> {
  return request(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function del(path: string): Promise<unknown> {
  return request(path, { method: "DELETE" });
}
