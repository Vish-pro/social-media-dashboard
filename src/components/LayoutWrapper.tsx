"use client";

import React from "react";
import { useSession, signIn } from "next-auth/react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)"
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          border: "3px solid var(--border-color)",
          borderTopColor: "var(--accent-primary)",
          animation: "spin 1s linear infinite"
        }} />
        <style jsx global>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{
        display: "flex",
        minHeight: "100vh",
        width: "100vw",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent), radial-gradient(circle at bottom left, rgba(79, 70, 229, 0.15), transparent), var(--bg-primary)",
        padding: "20px"
      }}>
        <div style={{
          maxWidth: "420px",
          width: "100%",
          background: "var(--glass-bg)",
          backdropFilter: "blur(12px)",
          border: "1px solid var(--border-color)",
          borderRadius: "16px",
          padding: "40px 32px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "2.5rem",
            marginBottom: "16px",
            display: "inline-block",
            background: "linear-gradient(135deg, #a5b4fc, #6366f1)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontWeight: 800,
            letterSpacing: "-0.05em"
          }}>
            ⚡ SocialPulse
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "8px" }}>
            Welcome Back
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "32px" }}>
            Sign in to manage your workspaces, view analytics, and publish content.
          </p>

          <button
            onClick={() => signIn("google")}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              background: "#ffffff",
              color: "#0a0a0a",
              padding: "12px 24px",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "0.95rem",
              transition: "transform 0.2s, box-shadow 0.2s",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(255, 255, 255, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Continue with Google
          </button>

          <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
            <button
              onClick={() => signIn("instagram")}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
                color: "#fff",
                padding: "10px",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer"
              }}
            >
              📷 Instagram
            </button>
            <button
              onClick={() => signIn("threads")}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: "#000000",
                color: "#ffffff",
                padding: "10px",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 600,
                border: "1px solid var(--border-color)",
                cursor: "pointer"
              }}
            >
              🧵 Threads
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-container">{children}</main>
      </div>
    </div>
  );
}

