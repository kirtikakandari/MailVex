import { useEffect, useState } from "react";
import { checkAuth, logout } from "../services/auth";

export function useAuth() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth()
      .then(setUser)
      .catch((error) => {
        console.error("Authentication check failed:", error);
        setUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  return { user, setUser, authLoading, handleLogout };
}
