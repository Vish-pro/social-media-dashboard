"use client";

import React, { useEffect, useState } from "react";
// Auth bypassed for demo mode
import StatCard from "@/components/StatCard";
import ChartCard from "@/components/ChartCard";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import "./page-styles.css";

interface Channel {
  name: string;
  thumbnail: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  commentCount: number;
}

interface ChartPoint {
  day: string;
  views: number;
  subscribers: number;
}

interface YTStats {
  connected: boolean;
  channel?: Channel;
  chartData?: ChartPoint[];
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export default function Dashboard() {
  const { activeWorkspaceId } = useWorkspace();
  const [stats, setStats] = useState<YTStats | null>(null);
  const [loading, setLoading] = useState(false);
  // Read connections from localStorage (set by /connections page)
  const [lsConnections, setLsConnections] = useState<Record<string, any>>({});

  useEffect(() => {
    const saved = localStorage.getItem("socialpulse_connections");
    if (saved) {
      try { setLsConnections(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    setLoading(true);
    fetch(`/api/youtube/stats?workspaceId=${activeWorkspaceId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.connected && data.channel) {
          setStats(data);
        } else {
          setStats(null);
        }
      })
      .catch((err) => console.error("Error loading YouTube stats:", err))
      .finally(() => setLoading(false));
  }, [activeWorkspaceId]);

  const ch = stats?.channel;
  const placeholder = "—";

  return (
    <div className="dashboard-wrapper">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">Welcome back! Here's what's happening with your accounts today.</p>
        </div>
        <a href="/posts/new" className="btn-primary" style={{ padding: "12px 24px" }}>
          <span>✍️</span> Create New Post
        </a>
      </div>

      <div className="dashboard-grid">
        <StatCard title="Subscribers" value={loading ? "..." : ch ? fmt(ch.subscriberCount) : placeholder} icon="👥" />
        <StatCard title="Total Views"  value={loading ? "..." : ch ? fmt(ch.viewCount)        : placeholder} icon="🔥" />
        <StatCard title="Videos"       value={loading ? "..." : ch ? ch.videoCount.toString() : placeholder} icon="🎬" />
        <StatCard title="Comments"     value={loading ? "..." : ch ? fmt(ch.commentCount)     : placeholder} icon="💬" />
      </div>

      <div className="dashboard-grid-large">
        <ChartCard title="Channel Analytics" data={loading ? undefined : (stats?.chartData ?? [])} />

        <div className="connected-accounts-card">
          <div className="chart-header">
            <h3 className="chart-title">Connected Accounts</h3>
            <a href="/connections" style={{ fontSize: "0.8rem", color: "var(--accent)", textDecoration: "none" }}>
              Manage →
            </a>
          </div>

          <div className="accounts-list">
            {/* YouTube */}
            <div className="account-item">
              <div className="account-platform-icon yt-icon">▶</div>
              <div className="account-info">
                {ch ? (
                  <>
                    <span className="account-name">{ch.name}</span>
                    <span className="account-meta">{fmt(ch.subscriberCount)} subscribers</span>
                  </>
                ) : (
                  <>
                    <span className="account-name">YouTube</span>
                    <span className="account-meta">{loading ? "Loading..." : "Not connected"}</span>
                  </>
                )}
              </div>
              {ch ? (
                <span className="account-badge connected">✓ Connected</span>
              ) : (
                <button
                  className="btn-primary account-connect-btn"
                  onClick={() => {
                    if (activeWorkspaceId) {
                      window.location.href = `/api/youtube/connect?workspaceId=${activeWorkspaceId}`;
                    }
                  }}
                  disabled={loading || !activeWorkspaceId}
                >
                  Connect
                </button>
              )}
            </div>

            {/* Bluesky */}
            <div className="account-item">
              <div className="account-platform-icon" style={{ background: "#0085ff", color: "#fff" }}>🦋</div>
              <div className="account-info">
                <span className="account-name">Bluesky</span>
                <span className="account-meta">
                  {lsConnections.bluesky ? `@${lsConnections.bluesky.handle}` : "Not connected"}
                </span>
              </div>
              {lsConnections.bluesky ? (
                <span className="account-badge connected">✓ Connected</span>
              ) : (
                <a href="/connections" className="btn-primary account-connect-btn" style={{ textDecoration: "none", textAlign: "center" }}>
                  Connect
                </a>
              )}
            </div>

            {/* LinkedIn */}
            <div className="account-item">
              <div className="account-platform-icon" style={{ background: "#0077b5", color: "#fff", fontWeight: 700 }}>in</div>
              <div className="account-info">
                <span className="account-name">LinkedIn</span>
                <span className="account-meta">
                  {lsConnections.linkedin ? lsConnections.linkedin.name : "Not connected"}
                </span>
              </div>
              {lsConnections.linkedin ? (
                <span className="account-badge connected">✓ Connected</span>
              ) : (
                <a href="/connections" className="btn-primary account-connect-btn" style={{ textDecoration: "none", textAlign: "center" }}>
                  Connect
                </a>
              )}
            </div>

            {/* Medium */}
            <div className="account-item">
              <div className="account-platform-icon" style={{ background: "#000", color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>M</div>
              <div className="account-info">
                <span className="account-name">Medium</span>
                <span className="account-meta">
                  {lsConnections.medium ? `@${lsConnections.medium.username}` : "Not connected"}
                </span>
              </div>
              {lsConnections.medium ? (
                <span className="account-badge connected">✓ Connected</span>
              ) : (
                <a href="/connections" className="btn-primary account-connect-btn" style={{ textDecoration: "none", textAlign: "center" }}>
                  Connect
                </a>
              )}
            </div>

            {/* Coming soon */}
            {[{ name: "X / Twitter", icon: "𝕏" }, { name: "Instagram", icon: "📷" }].map((p) => (
              <div key={p.name} className="account-item">
                <div className="account-platform-icon">{p.icon}</div>
                <div className="account-info">
                  <span className="account-name">{p.name}</span>
                  <span className="account-meta">Not connected</span>
                </div>
                <span className="account-badge soon">Soon</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
