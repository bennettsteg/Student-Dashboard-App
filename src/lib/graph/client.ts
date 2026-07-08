const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

export async function graphFetch(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(`${GRAPH_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Graph API error ${res.status}: ${await res.text()}`);
  }
  return res;
}
