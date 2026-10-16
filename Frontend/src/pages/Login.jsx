import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
  const { user, login } = useAuth();
  const [error, setError] = useState("");

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="login-card">
      <h1>💸 Spend Tracker</h1>
      <p>Sign in with your Google account to see your expenses.</p>
      <div className="login-btn">
        <GoogleLogin
          onSuccess={async (res) => {
            try {
              setError("");
              await login(res.credential);
            } catch (e) {
              setError(e.message);
            }
          }}
          onError={() => setError("Google sign-in failed. Please try again.")}
        />
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default Login;
