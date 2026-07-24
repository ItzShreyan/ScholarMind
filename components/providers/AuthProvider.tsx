"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { logAuthFailure } from "@/lib/auth/error-messages";
import { createClient } from "@/lib/supabase/client";

type AuthCtx = { session: Session | null; loading: boolean };
const AuthContext = createContext<AuthCtx>({ session: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) logAuthFailure("session", error);
        setSession(data.session);
      })
      .catch((error) => {
        logAuthFailure("session", error);
        setSession(null);
      })
      .finally(() => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) =>
      setSession(nextSession)
    );
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({ session, loading }), [session, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
