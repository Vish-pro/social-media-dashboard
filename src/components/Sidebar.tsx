import Link from "next/link";
import React from "next";
import "./Sidebar.css";
import "./Workspace.css";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>SocialPulse</h2>
      </div>

      <div className="workspace-switcher">
        <select className="workspace-select">
          <option>Personal Brand</option>
          <option>Vavvy Workspace</option>
        </select>
      </div>
      
      <nav className="sidebar-nav">
        <ul>
          <li>
            <Link href="/" className="nav-item active">
              <span className="icon">📊</span>
              Dashboard
            </Link>
          </li>
          <li>
            <Link href="/analytics" className="nav-item">
              <span className="icon">📈</span>
              Analytics
            </Link>
          </li>
          <li>
            <Link href="/posts" className="nav-item">
              <span className="icon">📝</span>
              Posts
            </Link>
          </li>
          <li>
            <Link href="/audience" className="nav-item">
              <span className="icon">👥</span>
              Audience
            </Link>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <Link href="/settings" className="nav-item">
          <span className="icon">⚙️</span>
          Settings
        </Link>
      </div>
    </aside>
  );
}
