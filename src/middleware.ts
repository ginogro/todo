import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_request: NextRequest) {
  return NextResponse.redirect(new URL("/proyectos", _request.url));
}

export const config = {
  matcher: "/",
};
