"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import CalendarView from "@/components/CalendarView";
import ChannelFilter from "@/components/ChannelFilter";
import { useWorkspace } from "@/contexts/WorkspaceContext";
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
  const { activeWorkspaceId } = useWorkspace();
  const [activeTab, setActiveTab] = useState<Tab>("queue");
  const [view, setView] = useState<View>("list");
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [isPostsDropdownOpen, setIsPostsDropdownOpen] = useState(false);
  const postsDropdownRef = useRef<HTMLDivElement>(null);
  
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const msg = EMPTY[activeTab];

  const fetchPosts = () => {
    if (!activeWorkspaceId) {
      setPosts([]);
      return;
    }
    setLoading(true);
    let statusFilter = "SCHEDULED";
    if (activeTab === "drafts") statusFilter = "DRAFT";
    else if (activeTab === "approvals") statusFilter = "PENDING_APPROVAL";
    else if (activeTab === "sent") statusFilter = "PUBLISHED";
    else if (activeTab === "queue") statusFilter = "SCHEDULED";

    fetch(`/api/posts?workspaceId=${activeWorkspaceId}&status=${statusFilter}`)
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.posts ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchPosts();
  }, [activeTab, activeWorkspaceId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (postsDropdownRef.current && !postsDropdownRef.current.contains(event.target as Node)) {
        setIsPostsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/posts/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        fetchPosts();
      } else {
        alert("Approval failed: " + data.error);
      }
    } catch {
      alert("Error approving post.");
    }
  };

  const handleReject = async (id: string) => {
    const feedback = prompt("Enter rejection feedback/comment:");
    if (feedback === null) return; // User cancelled
    
    try {
      const res = await fetch(`/api/posts/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback || "Rejected by Administrator" }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchPosts();
      } else {
        alert("Rejection failed: " + data.error);
      }
    } catch {
      alert("Error rejecting post.");
    }
  };

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
        <div className="posts-content" style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "20px 0" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Loading posts...</div>
          ) : posts.length > 0 ? (
            posts.map((post) => (
              <div
                key={post.id}
                className="post-item"
                style={{
                  padding: "16px",
                  background: "var(--bg-card)",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                }}
              >
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "8px",
                    background: "var(--accent-dim, #ebe9fe)",
                    color: "var(--accent, #6366f1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    fontWeight: "bold"
                  }}>
                    {post.mediaUrls?.[0] ? "🖼️" : "📝"}
                  </div>
                  <div>
                    <p style={{ fontWeight: "600", margin: 0, color: "var(--text)" }}>{post.content}</p>
                    <div style={{ display: "flex", gap: "12px", marginTop: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
                      <span>Status: <strong style={{ color: post.status === "PENDING_APPROVAL" ? "var(--warning)" : "inherit" }}>{post.status}</strong></span>
                      {post.scheduledFor && (
                        <span>📅 {new Date(post.scheduledFor).toLocaleString()}</span>
                      )}
                    </div>
                    {post.error && (
                      <p style={{ color: "var(--danger, #ef4444)", fontSize: "12px", margin: "6px 0 0 0" }}>
                        ⚠️ Feedback: {post.error}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  {activeTab === "approvals" && (
                    <>
                      <button
                        onClick={() => handleApprove(post.id)}
                        className="btn-primary"
                        style={{ padding: "8px 16px", fontSize: "14px" }}
                      >
                        Approve ✓
                      </button>
                      <button
                        onClick={() => handleReject(post.id)}
                        className="btn-secondary"
                        style={{
                          padding: "8px 16px",
                          fontSize: "14px",
                          background: "#dc2626",
                          border: "none",
                          borderRadius: "6px",
                          color: "#fff",
                          cursor: "pointer"
                        }}
                      >
                        Reject ✕
                      </button>
                    </>
                  )}
                  {activeTab === "drafts" && (
                    <Link
                      href="/posts/new"
                      className="btn-secondary"
                      style={{ padding: "8px 16px", fontSize: "14px" }}
                    >
                      Edit ✏️
                    </Link>
                  )}
                </div>
              </div>
            ))
          ) : (
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
          )}
        </div>
      )}
    </div>
  );
}
