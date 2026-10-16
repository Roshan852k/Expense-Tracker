import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getMe, getToken, loginWithGoogle, setToken, setUnauthorizedHandler } from "../services/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken()); // restoring a saved session

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  useEffect(() => {
    if (!getToken()) return;
    getMe()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  // `credential` is the Google ID token from <GoogleLogin onSuccess>.
  const login = async (credential) => {
    const { access_token, user } = await loginWithGoogle(credential);
    setToken(access_token);
    setUser(user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
