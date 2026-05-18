"use client";

import React, { useState } from "react";
import Link from "next/link";
import CalendarView from "@/components/CalendarView";
import "./posts.css";

type Tab = "queue" | "drafts" | "approvals" | "sent";
type View = "list" | "calendar";

const TABS: { id: Tab; label: string; count: number; badge?: string }[] = [
  { id: "queue", label: "Queue", count: 0 },
  { id: "drafts", label: "Drafts", count: 0 },
  { id: "approvals", label: "Approvals", count: 0, badge: "⚡" },
  { id: "sent", label: "Sent", count: 0 },
];

const EMPTY: Record<Tab, { title: string; subtitle: string }> = {
  queue: {
    title: "No posts scheduled",
    subtitle: "Schedule some posts and they will appear here",
  },
  drafts: {
    title: "No drafts yet",
    subtitle: "Save posts as drafts to continue editing later",
  },
  approvals: {
    title: "No posts pending approval",
    subtitle: "Posts submitted for review will appear here",
  },
  sent: {
    title: "No posts sent yet",
    subtitle: "Posts that have been published will appear here",
  },
};

export default function PostsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("queue");
  const [view, setView] = useState<View>("list");
  const msg = EMPTY[activeTab];

  return (
    <div className="posts-page">
      {/* ── Top bar ── */}
      <div className="posts-header">
        <div className="posts-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`posts-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.badge && <span className="tab-badge">{tab.badge}</span>}
              <span className="tab-count">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="posts-actions">
          {view === "list" && (
            <>
              <button className="btn-secondary posts-filter-btn">Channels ▾</button>
              <button className="btn-secondary posts-filter-btn">Tags ▾</button>
            </>
          )}
          <div className="view-toggle">
            <button
              className={`view-btn ${view === "list" ? "active" : ""}`}
              onClick={() => setView("list")}
            >
              ≡ List
            </button>
            <button
              className={`view-btn ${view === "calendar" ? "active" : ""}`}
              onClick={() => setView("calendar")}
            >
              ⊞ Calendar
            </button>
          </div>
          <Link href="/posts/new" className="btn-primary">+ New Post</Link>
        </div>
      </div>

      {/* ── Content ── */}
      {view === "calendar" ? (
        <CalendarView />
      ) : (
        <div className="posts-content">
          <div className="posts-empty">
            <div className="posts-empty-illustration">
              {[0, 1, 2].map((i) => (
                <div key={i} className="empty-card">
                  <div className="empty-card-line" />
                  <div className="empty-card-line short" />
                  <div className="empty-card-thumb" />
                </div>
              ))}
            </div>
            <h3 className="posts-empty-title">{msg.title}</h3>
            <p className="posts-empty-subtitle">{msg.subtitle}</p>
            <Link href="/posts/new" className="btn-primary" style={{ marginTop: "8px" }}>
              + New Post
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
