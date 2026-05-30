"use client";

import React from "react";
import { useSession, signOut } from "next-auth/react";
import "./Header.css";

export default function Header() {
  const { data: session } = useSession();
  const user = session?.user;

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

        {user && (
          <div 
            className="user-profile" 
            style={{ cursor: "pointer" }} 
            onClick={() => signOut()}
            title="Click to Sign Out"
          >
            {user.image ? (
              <img src={user.image} alt={user.name || "User"} className="avatar-img" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div className="avatar">{(user.name || "U")[0]}</div>
            )}
            <div className="user-info">
              <span className="name">{user.name}</span>
              <span className="role" style={{ color: "var(--accent-hover)", fontSize: "0.75rem" }}>Sign Out</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

