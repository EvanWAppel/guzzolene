import { clerkMiddleware, clerkClient, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Anonymous-accessible routes. `/` and `/demo` are the public recruiter
// surfaces (PRD §5.4); everything else falls through to the auth gate below.
export const PUBLIC_ROUTES = [
  "/",
  "/demo",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pending",
  "/api/webhooks(.*)",
];

const isPublicRoute = createRouteMatcher(PUBLIC_ROUTES);

export const proxy = clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId } = await auth();

  // Not signed in → redirect to sign-in
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Fetch fresh user metadata directly from Clerk API —
  // publicMetadata is not included in the JWT session claims by default in Clerk v7
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = user.publicMetadata as Record<string, unknown>;

  if (meta?.approved !== true && meta?.role !== "admin") {
    return NextResponse.redirect(new URL("/pending", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
