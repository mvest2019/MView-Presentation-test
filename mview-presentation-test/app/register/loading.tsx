import { AuthSkeleton } from "../_components/auth-skeleton";

/** Sign-up's fallback, for the same reason sign-in has one — `/register` also
 *  redirects a visitor who already has a session. */
export default function Loading() {
  return <AuthSkeleton label="Loading sign up…" />;
}
