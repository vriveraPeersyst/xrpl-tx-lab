import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEFAULT_NETWORK, isNetworkId } from "@/lib/networks";

/** Section roots that exist under /[net]. Paths starting with one of them but without a network prefix
 *  (old links such as /tx/Payment) are redirected to the default network. */
const SECTIONS = ["tx", "objects", "amendments", "reserves", "results", "fields", "permissions", "libraries", "account", "sync"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if (SECTIONS.includes(first) && !isNetworkId(first)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_NETWORK}${pathname}`;
    url.search = search;
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/tx/:path*", "/objects/:path*", "/amendments/:path*", "/reserves", "/results", "/fields/:path*", "/permissions", "/libraries", "/account", "/sync"],
};
