import { NextRequest } from "next/server";

/**
 * Returns the public origin (protocol and host) of the current request.
 *
 * This function attempts to reconstruct the public-facing base URL as seen by clients
 * and external services, accounting for reverse proxy headers typically set in production,
 * such as `x-forwarded-proto` and `x-forwarded-host`.
 *
 * - If present, `x-forwarded-host` is prioritized over the plain `host` header.
 * - If present, `x-forwarded-proto` is prioritized over the default "https" protocol.
 * - Throws an error if no host header is present, as it cannot construct a valid origin.
 *
 * @param {NextRequest} req - The Next.js request object
 * @returns {string} The reconstructed public origin in the format "protocol://host"
 * @throws {Error} If the host header is missing and the origin cannot be determined
 *
 * @example
 * const origin = getPublicOrigin(req);
 * return NextResponse.redirect(new URL("/overview", origin), { status: 303 });
 */
export function getPublicOrigin(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");

  const proto = req.headers.get("x-forwarded-proto") ?? "https";

  if (!host) {
    throw new Error("Unable to determine request host");
  }

  return `${proto}://${host}`;
}
