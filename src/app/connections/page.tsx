"use client";
import React, { useState, useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import "./connections.css";

interface Connection {
  platform: "bluesky" | "linkedin" | "medium" | "youtube";
  label: string;
  icon: string;
  color: string;
  description: string;
  connected: boolean;
  accountName?: string;
}

export default function ConnectionsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [ytConnected, setYtConnected] = useState(false);
  const [ytName, setYtName] = useState("");

  const [blueskyHandle, setBlueskyHandle] = useState("");
  const [blueskyPassword, setBlueskyPassword] = useState("");
  const [blueskyTesting, setBlueskyTesting] = useState(false);
  const [blueskyMsg, setBlueskyMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [mediumToken, setMediumToken] = useState("");
  const [mediumTesting, setMediumTesting] = useState(false);
  const [mediumMsg, setMediumMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [connections, setConnections] = useState<Record<string, any>>({});

  // Fetch YouTube connection state dynamically
  useEffect(() => {
    if (!activeWorkspaceId) return;
    fetch(`/api/channels?workspaceId=${activeWorkspaceId}`)
      .then((r) => r.json())
      .then((d) => {
        const ytChannel = d.channels?.find((c: any) => c.platform === "youtube");
        if (ytChannel) {
          setYtConnected(true);
          setYtName(ytChannel.accountName);
        } else {
          setYtConnected(false);
          setYtName("");
        }
      })
      .catch(() => {
        setYtConnected(false);
        setYtName("");
      });
  }, [activeWorkspaceId]);

  // Load saved connections from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("socialpulse_connections");
    if (saved) {
      try { setConnections(JSON.parse(saved)); } catch {}
    }
    // Check for LinkedIn callback params
    const params = new URLSearchParams(window.location.search);
    const liToken = params.get("linkedin_token");
    const liName = params.get("linkedin_name");
    if (liToken) {
      const updated = {
        ...JSON.parse(localStorage.getItem("socialpulse_connections") ?? "{}"),
        linkedin: { token: liToken, name: liName ?? "LinkedIn User" },
      };
      localStorage.setItem("socialpulse_connections", JSON.stringify(updated));
      setConnections(updated);
      window.history.replaceState({}, "", "/connections");
    }
  }, []);

  function save(platform: string, data: any) {
    const updated = { ...connections, [platform]: data };
    localStorage.setItem("socialpulse_connections", JSON.stringify(updated));
    setConnections(updated);
  }

  async function disconnect(platform: string) {
    if (platform === "youtube") {
      if (!activeWorkspaceId) return;
      try {
        const res = await fetch(`/api/channels?workspaceId=${activeWorkspaceId}&platform=youtube`, {
          method: "DELETE",
        });
        if (res.ok) {
          setYtConnected(false);
          setYtName("");
        }
      } catch (err) {
        console.error("Failed to disconnect YouTube:", err);
      }
      return;
    }
    const updated = { ...connections };
    delete updated[platform];
    localStorage.setItem("socialpulse_connections", JSON.stringify(updated));
    setConnections(updated);
  }


  async function testBluesky() {
    if (!blueskyHandle || !blueskyPassword) {
      setBlueskyMsg({ type: "err", text: "Enter your handle and App Password." });
      return;
    }
    setBlueskyTesting(true);
    setBlueskyMsg(null);
    try {
      const res = await fetch("/api/bluesky/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: blueskyHandle,
          appPassword: blueskyPassword,
          text: "🔗 Connected SocialPulse Dashboard to Bluesky!",
        }),
      });
      if (res.ok) {
        save("bluesky", { handle: blueskyHandle, appPassword: blueskyPassword });
        setBlueskyMsg({ type: "ok", text: `✓ Connected as @${blueskyHandle}` });
        setBlueskyHandle("");
        setBlueskyPassword("");
      } else {
        const d = await res.json();
        setBlueskyMsg({ type: "err", text: d.error ?? "Connection failed." });
      }
    } catch {
      setBlueskyMsg({ type: "err", text: "Network error. Check your credentials." });
    }
    setBlueskyTesting(false);
  }

  async function testMedium() {
    if (!mediumToken) {
      setMediumMsg({ type: "err", text: "Enter your Medium Integration Token." });
      return;
    }
    setMediumTesting(true);
    setMediumMsg(null);
    try {
      const meRes = await fetch("https://api.medium.com/v1/me", {
        headers: { Authorization: `Bearer ${mediumToken}` },
      });
      if (meRes.ok) {
        const { data } = await meRes.json();
        save("medium", { token: mediumToken, name: data.name, username: data.username });
        setMediumMsg({ type: "ok", text: `✓ Connected as ${data.name} (@${data.username})` });
        setMediumToken("");
      } else {
        setMediumMsg({ type: "err", text: "Invalid token. Check Medium → Settings → Integration tokens." });
      }
    } catch {
      setMediumMsg({ type: "err", text: "Network error verifying Medium token." });
    }
    setMediumTesting(false);
  }

  const platforms = [
    {
      id: "bluesky",
      label: "Bluesky",
      icon: "🦋",
      color: "#0085ff",
      description: "Free & open. No review required. Use your handle + App Password.",
      steps: [
        "Go to bsky.app → Settings → Privacy and Security",
        'Click "App Passwords" → Add App Password',
        'Name it "SocialPulse" → Copy the password',
        "Enter your handle (e.g. yourname.bsky.social) and the password below",
      ],
      difficulty: "Easy",
      difficultyColor: "#22c55e",
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      icon: "in",
      color: "#0077b5",
      description: "Professional network. OAuth 2.0 — click Connect to authorise.",
      steps: [
        "Create an app at developers.linkedin.com/apps",
        "Add product: Share on LinkedIn (self-serve, instant)",
        "Under Auth, add redirect URI: http://localhost:3001/api/linkedin/callback",
        'Copy Client ID & Secret to .env as LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET',
        'Click "Connect LinkedIn" below to start OAuth flow',
      ],
      difficulty: "Medium",
      difficultyColor: "#f59e0b",
    },
    {
      id: "medium",
      label: "Medium",
      icon: "M",
      color: "#000000",
      description: "Long-form content publishing. Paste your Integration Token — done!",
      steps: [
        "Log in to Medium → Click your avatar → Settings",
        "Go to Security and apps → Integration tokens",
        'Create a token named "SocialPulse"',
        "Paste the token below",
      ],
      difficulty: "Very Easy",
      difficultyColor: "#22c55e",
    },
    {
      id: "youtube",
      label: "YouTube",
      icon: "▶",
      color: "#ff0000",
      description: "Video platform. Connect via Google OAuth on the Dashboard.",
      steps: [
        "Go to the main Dashboard page",
        'Click "Connect YouTube" in the Connected Accounts section',
        "Sign in with your Google account",
      ],
      difficulty: "Easy",
      difficultyColor: "#22c55e",
    },
  ];

  return (
    <div className="connections-page">
      <div className="page-header">
        <h1 className="page-title">Connected Accounts</h1>
        <p className="page-subtitle">
          Link your social media accounts to publish and schedule posts from one place.
        </p>
      </div>

      <div className="connections-grid">
        {platforms.map((p) => {
          const isConnected = p.id === "youtube" ? ytConnected : !!connections[p.id];
          const conn = connections[p.id];

          return (
            <div key={p.id} className={`conn-card ${isConnected ? "conn-card--connected" : ""}`}>
              <div className="conn-card-header">
                <div className="conn-icon" style={{ background: p.color }}>
                  {p.icon}
                </div>
                <div className="conn-meta">
                  <div className="conn-name">{p.label}</div>
                  <div className="conn-desc">{p.description}</div>
                </div>
                <div className="conn-badges">
                  <span className="difficulty-badge" style={{ color: p.difficultyColor, borderColor: p.difficultyColor }}>
                    {p.difficulty}
                  </span>
                  {isConnected && <span className="connected-badge">✓ Connected</span>}
                </div>
              </div>

              {isConnected ? (
                <div className="conn-connected-state">
                  <div className="conn-account-info">
                    {p.id === "bluesky" && <span>@{conn.handle}</span>}
                    {p.id === "linkedin" && <span>{conn.name}</span>}
                    {p.id === "medium" && <span>{conn.name} (@{conn.username})</span>}
                    {p.id === "youtube" && <span>{ytName || "YouTube Channel"}</span>}
                  </div>
                  <button className="btn-disconnect" onClick={() => disconnect(p.id)}>
                    Disconnect
                  </button>
                </div>
              ) : (
                <>
                  {/* How-to steps */}
                  <details className="conn-steps">
                    <summary className="conn-steps-summary">How to get credentials ›</summary>
                    <ol className="conn-steps-list">
                      {p.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </details>

                  {/* Bluesky connect form */}
                  {p.id === "bluesky" && (
                    <div className="conn-form">
                      <input
                        className="conn-input"
                        placeholder="yourname.bsky.social"
                        value={blueskyHandle}
                        onChange={(e) => setBlueskyHandle(e.target.value)}
                      />
                      <input
                        className="conn-input"
                        type="password"
                        placeholder="App Password (xxxx-xxxx-xxxx-xxxx)"
                        value={blueskyPassword}
                        onChange={(e) => setBlueskyPassword(e.target.value)}
                      />
                      <button
                        className="btn-primary"
                        onClick={testBluesky}
                        disabled={blueskyTesting}
                      >
                        {blueskyTesting ? "Connecting…" : "Connect Bluesky 🦋"}
                      </button>
                      {blueskyMsg && (
                        <p className={`conn-msg conn-msg--${blueskyMsg.type}`}>{blueskyMsg.text}</p>
                      )}
                    </div>
                  )}

                  {/* LinkedIn connect — OAuth redirect */}
                  {p.id === "linkedin" && (
                    <div className="conn-form">
                      <a href="/api/linkedin/auth" className="btn-primary conn-oauth-btn">
                        Connect LinkedIn →
                      </a>
                      <p className="conn-hint">
                        Requires <code>LINKEDIN_CLIENT_ID</code> and{" "}
                        <code>LINKEDIN_CLIENT_SECRET</code> in your <code>.env</code> file.
                      </p>
                    </div>
                  )}

                  {/* Medium connect — token input */}
                  {p.id === "medium" && (
                    <div className="conn-form">
                      <input
                        className="conn-input"
                        type="password"
                        placeholder="Paste your Medium Integration Token"
                        value={mediumToken}
                        onChange={(e) => setMediumToken(e.target.value)}
                      />
                      <button
                        className="btn-primary"
                        onClick={testMedium}
                        disabled={mediumTesting}
                      >
                        {mediumTesting ? "Verifying…" : "Connect Medium M"}
                      </button>
                      {mediumMsg && (
                        <p className={`conn-msg conn-msg--${mediumMsg.type}`}>{mediumMsg.text}</p>
                      )}
                    </div>
                  )}

                  {/* YouTube — redirect to dashboard */}
                  {p.id === "youtube" && (
                    <div className="conn-form">
                      <a href="/" className="btn-primary conn-oauth-btn">
                        Go to Dashboard to Connect ▶
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Coming Soon */}
      <div className="coming-soon-section">
        <h2 className="coming-soon-title">Coming Soon</h2>
        <div className="coming-soon-grid">
          {[
            { icon: "🐦", name: "X / Twitter", note: "Requires $100/mo Basic plan" },
            { icon: "📸", name: "Instagram", note: "Business API — review required" },
            { icon: "🧵", name: "Threads", note: "Limited API access" },
            { icon: "🤖", name: "Reddit", note: "Manual app approval required" },
            { icon: "📌", name: "Pinterest", note: "Media posts only" },
            { icon: "📝", name: "Dev.to", note: "API key — coming next" },
          ].map((p) => (
            <div key={p.name} className="coming-soon-card">
              <span className="coming-soon-icon">{p.icon}</span>
              <span className="coming-soon-name">{p.name}</span>
              <span className="coming-soon-note">{p.note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
