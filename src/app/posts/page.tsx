"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import CalendarView from "@/components/CalendarView";
import ChannelFilter from "@/components/ChannelFilter";
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
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [isPostsDropdownOpen, setIsPostsDropdownOpen] = useState(false);
  const postsDropdownRef = useRef<HTMLDivElement>(null);
  
  const msg = EMPTY[activeTab];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (postsDropdownRef.current && !postsDropdownRef.current.contains(event.target as Node)) {
        setIsPostsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="posts-page">
      {/* ── Top bar ── */}
      <div className="posts-header">
        <div className="posts-tabs" style={{ visibility: "hidden" }}>
          {/* We keep this div for flexbox spacing if needed, or remove it */}
        </div>

        <div className="posts-actions">
          <div className="cal-dropdown-container" ref={postsDropdownRef}>
            <button 
              className="btn-secondary posts-filter-btn"
              onClick={() => setIsPostsDropdownOpen(!isPostsDropdownOpen)}
            >
              <span className="icon">⧉</span> {TABS.find(t => t.id === activeTab)?.label === "Queue" ? "All Posts" : TABS.find(t => t.id === activeTab)?.label} ▾
            </button>
            {isPostsDropdownOpen && (
              <div className="cal-dropdown-menu" style={{ width: "160px" }}>
                <label className="cal-dropdown-item" onClick={() => { setActiveTab("queue"); setIsPostsDropdownOpen(false); }}>
                  {activeTab === "queue" ? "✓ " : <span style={{width:"12px", display:"inline-block"}}></span>} All Posts
                </label>
                <label className="cal-dropdown-item" onClick={() => { setActiveTab("drafts"); setIsPostsDropdownOpen(false); }}>
                  {activeTab === "drafts" ? "✓ " : <span style={{width:"12px", display:"inline-block"}}></span>} Drafts
                </label>
                <label className="cal-dropdown-item" onClick={() => { setActiveTab("approvals"); setIsPostsDropdownOpen(false); }}>
                  {activeTab === "approvals" ? "✓ " : <span style={{width:"12px", display:"inline-block"}}></span>} Approvals
                </label>
                <label className="cal-dropdown-item" onClick={() => { setActiveTab("sent"); setIsPostsDropdownOpen(false); }}>
                  {activeTab === "sent" ? "✓ " : <span style={{width:"12px", display:"inline-block"}}></span>} Sent
                </label>
              </div>
            )}
          </div>

          <ChannelFilter selectedChannels={selectedChannels} onChange={setSelectedChannels} />
          
          <button className="btn-secondary posts-filter-btn">Tags ▾</button>
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
        <CalendarView selectedChannels={selectedChannels} />
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
