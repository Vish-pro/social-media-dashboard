"use client";

import React from "react";
import { useSession } from "next-auth/react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import SignInPage from "./SignInPage";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  // Show full-screen loader while NextAuth resolves the session
  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-primary)",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "3px solid rgba(99,102,241,0.2)",
            borderTopColor: "#6366f1",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Loading…</p>
      </div>
    );
  }

  // Show sign-in page for unauthenticated users
  if (status === "unauthenticated") {
    return <SignInPage />;
  }

  // Authenticated — render full app shell
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
