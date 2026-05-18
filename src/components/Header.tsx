import React from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import "./Header.css";

export default function Header() {
  const { data: session, status } = useSession();
  return (
    <header className="header">
      <div className="header-search">
        <span className="search-icon">🔍</span>
        <input type="text" placeholder="Search analytics, posts..." className="search-input" />
      </div>

      <div className="header-actions">
        <button className="icon-btn" aria-label="Notifications">
          <span className="icon">🔔</span>
          <span className="badge">3</span>
        </button>
        
        {status === "loading" ? (
          <div className="user-profile">Loading...</div>
        ) : session?.user ? (
          <div className="user-profile" onClick={() => signOut()}>
            {session.user.image ? (
              <img src={session.user.image} alt="Avatar" className="avatar" style={{ border: 'none' }} />
            ) : (
              <div className="avatar">{session.user.name?.[0] || "U"}</div>
            )}
            <div className="user-info">
              <span className="name">{session.user.name}</span>
              <span className="role">Sign out</span>
            </div>
          </div>
        ) : (
          <button className="btn-primary" onClick={() => signIn("google")}>
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
