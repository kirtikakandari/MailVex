import { useState } from "react";

const API_URL = "http://localhost:5000";

interface LoginProps {
  onLogin?: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ===============================
  // GOOGLE LOGIN
  // ===============================

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  // ===============================
  // EMAIL LOGIN / SIGNUP
  // ===============================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      console.log("Authenticated user:", data.user);

      if (onLogin) {
        onLogin(data.user);
      } else {
        window.location.href = "/";
      }
    } catch (error: any) {
      console.error("Email authentication failed:", error);

      setError(
        error.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          width: "510px",
          minHeight: "555px",
          border: "1px solid #e1e1e1",
          borderRadius: "8px",
          padding: "48px 64px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {/* TITLE */}

        <h1
          style={{
            textAlign: "center",
            fontSize: "42px",
            fontWeight: "500",
            margin: "0 0 40px 0",
            color: "#111111",
          }}
        >
          Login
        </h1>

        {/* GOOGLE BUTTON */}

        <button
          type="button"
          onClick={handleGoogleLogin}
          style={{
            width: "100%",
            height: "54px",
            border: "none",
            borderRadius: "10px",
            background: "#dff5eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            fontSize: "17px",
            color: "#222222",
            cursor: "pointer",
          }}
        >
          {/* Google Logo */}

          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#4285F4"
              d="M21.35 12.27c0-.79-.07-1.55-.22-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42z"
            />
            <path
              fill="#34A853"
              d="M12 21.7c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.75 9.75 0 0 0 12 21.7z"
            />
            <path
              fill="#FBBC05"
              d="M6.54 13.78A5.86 5.86 0 0 1 6.23 12c0-.62.11-1.22.31-1.78V7.69H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.31l3.24-2.53z"
            />
            <path
              fill="#EA4335"
              d="M12 6.19c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.27 14.63 2.3 12 2.3a9.75 9.75 0 0 0-8.7 5.39l3.24 2.53C7.31 7.91 9.46 6.19 12 6.19z"
            />
          </svg>

          <span>Sign in with Google</span>
        </button>

        {/* DIVIDER */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            margin: "32px 0",
            color: "#b4b4b4",
            fontSize: "14px",
          }}
        >
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "#dedede",
            }}
          />

          <span>or sign up through email</span>

          <div
            style={{
              flex: 1,
              height: "1px",
              background: "#dedede",
            }}
          />
        </div>

        {/* FORM */}

        <form onSubmit={handleSubmit}>
          {/* EMAIL */}

          <input
            type="email"
            placeholder="Email ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              height: "62px",
              boxSizing: "border-box",
              border: "none",
              borderRadius: "10px",
              background: "#f0f4f2",
              padding: "0 22px",
              fontSize: "16px",
              outline: "none",
              marginBottom: "16px",
            }}
          />

          {/* PASSWORD */}

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              height: "62px",
              boxSizing: "border-box",
              border: "none",
              borderRadius: "10px",
              background: "#f0f4f2",
              padding: "0 22px",
              fontSize: "16px",
              outline: "none",
              marginBottom: "20px",
            }}
          />

          {/* ERROR */}

          {error && (
            <div
              style={{
                color: "#d93025",
                fontSize: "14px",
                marginBottom: "16px",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          {/* LOGIN BUTTON */}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              height: "55px",
              border: "none",
              borderRadius: "10px",
              background: loading ? "#79c99a" : "#00b746",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Please wait..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}