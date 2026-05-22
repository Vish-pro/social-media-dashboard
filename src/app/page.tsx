"use client";

import React from "react";
import { useSession, signIn } from "next-auth/react";
import useSWR from "swr";
import StatCard from "@/components/StatCard";
import ChartCard from "@/components/ChartCard";
import "./page-styles.css";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
  const { status } = useSession();

  const isAuth = status === "authenticated";

  const { data: stats, isLoading: isStatsLoading } = useSWR<YTStats>(
    isAuth ? "/api/youtube/stats" : null,
    fetcher
  );

  const { data: connData, isLoading: isConnLoading } = useSWR<{ providers: string[] }>(
    isAuth ? "/api/auth/connected" : null,
    fetcher
  );

  const loading = status === "loading" || isStatsLoading || isConnLoading;
  const connectedProviders = connData?.providers ?? [];

  const ch = stats?.channel;
  const placeholder = "—";

  return (
    <div className="dashboard-wrapper">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">Welcome back! Here&apos;s what&apos;s happening with your accounts today.</p>
        </div>
        <a href="/posts/new" className="btn-primary" style={{ padding: "12px 24px" }}>
          <span>✍️</span> Create New Post
        </a>
      </div>

      <div className="dashboard-grid">
        <StatCard
          title="Subscribers"
          value={loading ? "..." : ch ? fmt(ch.subscriberCount) : placeholder}
          icon="👥"
        />
        <StatCard
          title="Total Views"
          value={loading ? "..." : ch ? fmt(ch.viewCount) : placeholder}
          icon="🔥"
        />
        <StatCard
          title="Videos"
          value={loading ? "..." : ch ? ch.videoCount.toString() : placeholder}
          icon="🎬"
        />
        <StatCard
          title="Comments"
          value={loading ? "..." : ch ? fmt(ch.commentCount) : placeholder}
          icon="💬"
        />
      </div>

      <div className="dashboard-grid-large">
        <ChartCard
          title="Channel Analytics"
          data={loading ? undefined : (stats?.chartData ?? [])}
        />

        <div className="connected-accounts-card">
          <div className="chart-header">
            <h3 className="chart-title">Connected Accounts</h3>
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
                    <span className="account-meta">
                      {loading ? "Loading..." : "Not connected"}
                    </span>
                  </>
                )}
              </div>
              {ch ? (
                <span className="account-badge connected">✓ Connected</span>
              ) : (
                <button
                  className="btn-primary account-connect-btn"
                  onClick={() => signIn("google")}
                  disabled={loading}
                >
                  Connect
                </button>
              )}
            </div>

            {/* Instagram */}
            <div className="account-item">
              <div className="account-platform-icon" style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", color: "#fff" }}>📷</div>
              <div className="account-info">
                <span className="account-name">Instagram</span>
                <span className="account-meta">
                  {connectedProviders.includes("instagram") ? "Connected" : "Not connected"}
                </span>
              </div>
              {connectedProviders.includes("instagram") ? (
                <span className="account-badge connected">✓ Connected</span>
              ) : (
                <button
                  className="btn-primary account-connect-btn"
                  onClick={() => signIn("instagram")}
                  disabled={loading}
                >
                  Connect
                </button>
              )}
            </div>

            {/* Threads */}
            <div className="account-item">
              <div className="account-platform-icon" style={{ background: "#000", color: "#fff" }}>𝕋</div>
              <div className="account-info">
                <span className="account-name">Threads</span>
                <span className="account-meta">
                  {connectedProviders.includes("threads") ? "Connected" : "Not connected"}
                </span>
              </div>
              {connectedProviders.includes("threads") ? (
                <span className="account-badge connected">✓ Connected</span>
              ) : (
                <button
                  className="btn-primary account-connect-btn"
                  onClick={() => signIn("threads")}
                  disabled={loading}
                >
                  Connect
                </button>
              )}
            </div>

            {/* Future platforms */}
            {[{ name: "Facebook", icon: "🌐" }, { name: "TikTok", icon: "♪" }].map((p) => (
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
