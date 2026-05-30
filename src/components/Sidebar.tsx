"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import "./Sidebar.css";
import "./Workspace.css";

const NAV_ITEMS = [
  { href: "/",          icon: "📊", label: "Dashboard"  },
  { href: "/posts",     icon: "📝", label: "Posts"       },
  { href: "/analytics", icon: "📈", label: "Analytics"   },
  { href: "/audience",  icon: "👥", label: "Audience"    },
  { href: "/inbox",     icon: "📬", label: "Inbox"       },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { workspaces, activeWorkspace, activeWorkspaceId, setActiveWorkspaceId, isLoading, refetch } =
    useWorkspace();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      refetch();
      setActiveWorkspaceId(data.workspace.id);
      setNewName("");
      setDropdownOpen(false);
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">SP</div>
        <h2>SocialPulse</h2>
      </div>

      {/* Workspace Switcher */}
      <div className="workspace-switcher" ref={dropdownRef}>
        <button
          id="workspace-switcher-btn"
          className="ws-trigger"
          onClick={() => setDropdownOpen((o) => !o)}
          disabled={isLoading}
        >
          <div className="ws-avatar">
            {isLoading ? "…" : activeWorkspace ? getInitials(activeWorkspace.name) : "?"}
          </div>
          <span className="ws-name">
            {isLoading ? "Loading…" : activeWorkspace?.name ?? "No workspace"}
          </span>
          <span className="ws-chevron">{dropdownOpen ? "▲" : "▼"}</span>
        </button>

        {dropdownOpen && (
          <div className="ws-dropdown">
            <p className="ws-dropdown-label">Your Workspaces</p>

            {workspaces.map((w) => (
              <button
                key={w.id}
                className={`ws-option ${w.id === activeWorkspaceId ? "ws-option-active" : ""}`}
                onClick={() => {
                  setActiveWorkspaceId(w.id);
                  setDropdownOpen(false);
                }}
              >
                <div className="ws-avatar ws-avatar-sm">{getInitials(w.name)}</div>
                <span>{w.name}</span>
                {w.id === activeWorkspaceId && <span className="ws-check">✓</span>}
              </button>
            ))}

            <div className="ws-divider" />

            {/* Create workspace inline form */}
            <form onSubmit={handleCreate} className="ws-create-form">
              <input
                id="new-workspace-name"
                className="ws-create-input"
                placeholder="New workspace name…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={50}
              />
              <button
                id="btn-create-workspace"
                type="submit"
                className="ws-create-btn"
                disabled={creating || !newName.trim()}
              >
                {creating ? "…" : "+ Create"}
              </button>
            </form>
            {createError && <p className="ws-create-error">{createError}</p>}

            <div className="ws-divider" />
            <Link href="/settings" className="ws-settings-link" onClick={() => setDropdownOpen(false)}>
              ⚙️ Workspace Settings
            </Link>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <ul>
          {NAV_ITEMS.map(({ href, icon, label }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link href={href} className={`nav-item ${isActive ? "active" : ""}`}>
                  <span className="icon">{icon}</span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <Link href="/settings" className={`nav-item ${pathname === "/settings" ? "active" : ""}`}>
          <span className="icon">⚙️</span>
          Settings
        </Link>
      </div>
    </aside>
  );
}
