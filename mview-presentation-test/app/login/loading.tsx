import { AuthSkeleton } from "../_components/auth-skeleton";

/** Shown while `/login` renders — which for a visitor who already has a session
 *  means while it redirects to the portal. See `AuthSkeleton` for why that needs
 *  a fallback rather than resolving instantly. */
export default function Loading() {
  return <AuthSkeleton label="Loading sign in…" />;
}
