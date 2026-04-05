// src/app/api/_utils/forwardHeaders.ts

/**
 * Whitelist headers that are safe to forward to the backend API.
 * Adds X-API-Key from environment, forwarded header or cookie.
 */
export function forwardHeaders(req: Request, initHeaders?: HeadersInit): Record<string, string> {
  const allowed = ["Accept", "Content-Type", "Authorization", "Cookie", "X-API-Key"];
  const result: Record<string, string> = {};

  // copy initHeaders if provided
  if (initHeaders) {
    if (Array.isArray(initHeaders)) {
      for (const [k, v] of initHeaders) {
        if (allowed.includes(k)) result[k] = v;
      }
    } else if (initHeaders instanceof Headers) {
      initHeaders.forEach((v, k) => {
        if (allowed.includes(k)) result[k] = v;
      });
    } else {
      for (const k in initHeaders) {
        if (Object.prototype.hasOwnProperty.call(initHeaders, k) && allowed.includes(k)) {
          // @ts-ignore
          result[k] = initHeaders[k];
        }
      }
    }
  }

  // forward cookie, authorization from request
  const cookie = req.headers.get("cookie");
  if (cookie) result["Cookie"] = cookie;
  const auth = req.headers.get("authorization");
  if (auth) result["Authorization"] = auth;

  // X-API-Key from env, header, or cookie
  const envApiKey = process.env.TWHP_API_KEY;
  const forwardedApiKey = req.headers.get("x-api-key");
  let cookieApiKey = "";
  if (cookie) {
    const match = cookie.match(/api-key=([^;]+)/);
    if (match) cookieApiKey = match[1];
  }
  const apiKey = envApiKey || forwardedApiKey || cookieApiKey;
  if (apiKey) result["X-API-Key"] = apiKey;

  return result;
}
