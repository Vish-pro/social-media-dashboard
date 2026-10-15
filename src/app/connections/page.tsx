"use client";
import React, { useState, useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import "./connections.css";

interface Connection {
  platform: "bluesky" | "linkedin" | "medium" | "youtube" | "x";
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
  const [xConnected, setXConnected] = useState(false);
  const [xName, setXName] = useState("");

  const [fbConnected, setFbConnected] = useState(false);
  const [fbName, setFbName] = useState("");
  const [igConnected, setIgConnected] = useState(false);
  const [igName, setIgName] = useState("");
  const [thConnected, setThConnected] = useState(false);
  const [thName, setThName] = useState("");

  const [blueskyHandle, setBlueskyHandle] = useState("");
  const [blueskyPassword, setBlueskyPassword] = useState("");
  const [blueskyTesting, setBlueskyTesting] = useState(false);
  const [blueskyMsg, setBlueskyMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [mediumToken, setMediumToken] = useState("");
  const [mediumTesting, setMediumTesting] = useState(false);
  const [mediumMsg, setMediumMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [devtoConnected, setDevtoConnected] = useState(false);
  const [devtoName, setDevtoName] = useState("");
  const [devtoApiKey, setDevtoApiKey] = useState("");
  const [devtoTesting, setDevtoTesting] = useState(false);
  const [devtoMsg, setDevtoMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [redditConnected, setRedditConnected] = useState(false);
  const [redditName, setRedditName] = useState("");
  const [redditToken, setRedditToken] = useState("");
  const [redditSubreddit, setRedditSubreddit] = useState("");
  const [redditTesting, setRedditTesting] = useState(false);
  const [redditMsg, setRedditMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [pinterestConnected, setPinterestConnected] = useState(false);
  const [pinterestName, setPinterestName] = useState("");
  const [pinterestToken, setPinterestToken] = useState("");
  const [pinterestBoardId, setPinterestBoardId] = useState("");
  const [pinterestTesting, setPinterestTesting] = useState(false);
  const [pinterestMsg, setPinterestMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [connections, setConnections] = useState<Record<string, any>>({});

  // Fetch YouTube and X.com connection state dynamically
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

        const xChannel = d.channels?.find((c: any) => c.platform === "x");
        if (xChannel) {
          setXConnected(true);
          setXName(xChannel.accountName);
        } else {
          setXConnected(false);
          setXName("");
        }

        const fbChannel = d.channels?.find((c: any) => c.platform === "facebook");
        if (fbChannel) {
          setFbConnected(true);
          setFbName(fbChannel.accountName);
        } else {
          setFbConnected(false);
          setFbName("");
        }

        const igChannel = d.channels?.find((c: any) => c.platform === "instagram");
        if (igChannel) {
          setIgConnected(true);
          setIgName(igChannel.accountName);
        } else {
          setIgConnected(false);
          setIgName("");
        }

        const thChannel = d.channels?.find((c: any) => c.platform === "threads");
        if (thChannel) {
          setThConnected(true);
          setThName(thChannel.accountName);
        } else {
          setThConnected(false);
          setThName("");
        }

        const devtoChannel = d.channels?.find((c: any) => c.platform === "devto");
        if (devtoChannel) {
          setDevtoConnected(true);
          setDevtoName(devtoChannel.accountName);
        } else {
          setDevtoConnected(false);
          setDevtoName("");
        }

        const redditChannel = d.channels?.find((c: any) => c.platform === "reddit");
        if (redditChannel) {
          setRedditConnected(true);
          setRedditName(redditChannel.accountName);
        } else {
          setRedditConnected(false);
          setRedditName("");
        }

        const pinterestChannel = d.channels?.find((c: any) => c.platform === "pinterest");
        if (pinterestChannel) {
          setPinterestConnected(true);
          setPinterestName(pinterestChannel.accountName);
        } else {
          setPinterestConnected(false);
          setPinterestName("");
        }
      })
      .catch(() => {
        setYtConnected(false);
        setYtName("");
        setXConnected(false);
        setXName("");
        setFbConnected(false);
        setFbName("");
        setIgConnected(false);
        setIgName("");
        setThConnected(false);
        setThName("");
        setDevtoConnected(false);
        setDevtoName("");
        setRedditConnected(false);
        setRedditName("");
        setPinterestConnected(false);
        setPinterestName("");
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
    if (platform === "x") {
      if (!activeWorkspaceId) return;
      try {
        const res = await fetch(`/api/channels?workspaceId=${activeWorkspaceId}&platform=x`, {
          method: "DELETE",
        });
        if (res.ok) {
          setXConnected(false);
          setXName("");
        }
      } catch (err) {
        console.error("Failed to disconnect X.com:", err);
      }
      return;
    }
    if (["facebook", "instagram", "threads", "devto", "reddit", "pinterest"].includes(platform)) {
      if (!activeWorkspaceId) return;
      try {
        const res = await fetch(`/api/channels?workspaceId=${activeWorkspaceId}&platform=${platform}`, {
          method: "DELETE",
        });
        if (res.ok) {
          if (platform === "facebook") { setFbConnected(false); setFbName(""); }
          if (platform === "instagram") { setIgConnected(false); setIgName(""); }
          if (platform === "threads") { setThConnected(false); setThName(""); }
          if (platform === "devto") { setDevtoConnected(false); setDevtoName(""); }
          if (platform === "reddit") { setRedditConnected(false); setRedditName(""); }
          if (platform === "pinterest") { setPinterestConnected(false); setPinterestName(""); }
        }
      } catch (err) {
        console.error(`Failed to disconnect ${platform}:`, err);
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

  async function testDevto() {
    if (!devtoApiKey) {
      setDevtoMsg({ type: "err", text: "Enter your DEV.to API Key." });
      return;
    }
    setDevtoTesting(true);
    setDevtoMsg(null);
    try {
      const res = await fetch("/api/devto/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          apiKey: devtoApiKey,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setDevtoConnected(true);
        setDevtoName(d.account.accountName);
        setDevtoMsg({ type: "ok", text: `✓ Connected as ${d.account.accountName} (@${d.account.username})` });
        setDevtoApiKey("");
      } else {
        const d = await res.json();
        setDevtoMsg({ type: "err", text: d.error ?? "Connection failed." });
      }
    } catch {
      setDevtoMsg({ type: "err", text: "Network error. Check your credentials." });
    }
    setDevtoTesting(false);
  }

  async function testReddit() {
    if (!redditToken || !redditSubreddit) {
      setRedditMsg({ type: "err", text: "Enter your Access Token and Subreddit name." });
      return;
    }
    setRedditTesting(true);
    setRedditMsg(null);
    try {
      const res = await fetch("/api/reddit/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          accessToken: redditToken,
          subreddit: redditSubreddit,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setRedditConnected(true);
        setRedditName(d.account.accountName);
        setRedditMsg({ type: "ok", text: `✓ Connected to r/${d.account.username}` });
        setRedditToken("");
        setRedditSubreddit("");
      } else {
        const d = await res.json();
        setRedditMsg({ type: "err", text: d.error ?? "Connection failed." });
      }
    } catch {
      setRedditMsg({ type: "err", text: "Network error. Check your credentials." });
    }
    setRedditTesting(false);
  }

  async function testPinterest() {
    if (!pinterestToken || !pinterestBoardId) {
      setPinterestMsg({ type: "err", text: "Enter your Access Token and Board ID." });
      return;
    }
    setPinterestTesting(true);
    setPinterestMsg(null);
    try {
      const res = await fetch("/api/pinterest/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          accessToken: pinterestToken,
          boardId: pinterestBoardId,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setPinterestConnected(true);
        setPinterestName(d.account.accountName);
        setPinterestMsg({ type: "ok", text: `✓ Connected to Board: ${d.account.username}` });
        setPinterestToken("");
        setPinterestBoardId("");
      } else {
        const d = await res.json();
        setPinterestMsg({ type: "err", text: d.error ?? "Connection failed." });
      }
    } catch {
      setPinterestMsg({ type: "err", text: "Network error. Check your credentials." });
    }
    setPinterestTesting(false);
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
      id: "x",
      label: "X / Twitter",
      icon: "𝕏",
      color: "#000000",
      description: "Automated posting and scheduling. OAuth 2.0 Web App authorization.",
      steps: [
        "Click 'Connect X / Twitter' below",
        "Sign in and authorize the application with your X profile",
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
    {
      id: "facebook",
      label: "Facebook Pages",
      icon: "📘",
      color: "#1877f2",
      description: "Meta Graph API. Connect Facebook Pages to publish feed updates.",
      steps: [
        "Click 'Connect Facebook Pages' below",
        "Select your Pages & authorize SocialPulse",
      ],
      difficulty: "Very Easy",
      difficultyColor: "#22c55e",
    },
    {
      id: "instagram",
      label: "Instagram Business",
      icon: "📸",
      color: "#e1306c",
      description: "Meta Graph API. Connect Instagram Business profiles for image posts.",
      steps: [
        "Ensure your Instagram profile is linked to a Facebook Page",
        "Click 'Connect Instagram Business' below & authorize",
      ],
      difficulty: "Easy",
      difficultyColor: "#22c55e",
    },
    {
      id: "threads",
      label: "Meta Threads",
      icon: "🌀",
      color: "#000000",
      description: "Text & media platform. Connect Threads for scheduling threads.",
      steps: [
        "Click 'Connect Meta Threads' below",
        "Authorize your profile to schedule Threads posts",
      ],
      difficulty: "Easy",
      difficultyColor: "#22c55e",
    },
    {
      id: "devto",
      label: "DEV.to",
      icon: "📝",
      color: "#000000",
      description: "Technical blogging platform. Paste your DEV Community API Key.",
      steps: [
        "Log in to dev.to → Click your avatar → Settings",
        "Go to Extensions → DEV Community API Keys",
        "Generate a key name 'SocialPulse' and copy it",
        "Paste the key below (starts with 'mock_' for sandbox testing)",
      ],
      difficulty: "Very Easy",
      difficultyColor: "#22c55e",
    },
    {
      id: "reddit",
      label: "Reddit Subreddit",
      icon: "🤖",
      color: "#ff4500",
      description: "Community discussion forum. Paste your Access Token & target Subreddit.",
      steps: [
        "Go to reddit.com/prefs/apps and create an app",
        "Select 'script' app type, set redirect URI to http://localhost:3000",
        "Get your Client ID and Client Secret, then generate an access token",
        "Paste the token and target Subreddit name (e.g. test) below",
      ],
      difficulty: "Medium",
      difficultyColor: "#f59e0b",
    },
    {
      id: "pinterest",
      label: "Pinterest Board",
      icon: "📌",
      color: "#bd081c",
      description: "Image discovery board. Paste your Access Token & target Board ID.",
      steps: [
        "Go to Pinterest Developer Platform and create an application",
        "Generate a trial Access Token under the App details",
        "Find your target Pinterest Board ID from your profile board URL",
        "Paste the Access Token and Board ID below",
      ],
      difficulty: "Medium",
      difficultyColor: "#f59e0b",
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
          const isConnected = 
            p.id === "youtube" ? ytConnected : 
            p.id === "x" ? xConnected : 
            p.id === "facebook" ? fbConnected : 
            p.id === "instagram" ? igConnected : 
            p.id === "threads" ? thConnected : 
            p.id === "devto" ? devtoConnected : 
            p.id === "reddit" ? redditConnected : 
            p.id === "pinterest" ? pinterestConnected : 
            !!connections[p.id];
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
                    {p.id === "x" && <span>{xName || "X / Twitter"}</span>}
                    {p.id === "facebook" && <span>{fbName || "Facebook Page"}</span>}
                    {p.id === "instagram" && <span>{igName || "Instagram Business"}</span>}
                    {p.id === "threads" && <span>{thName || "Meta Threads"}</span>}
                    {p.id === "devto" && <span>{devtoName || "DEV.to Account"}</span>}
                    {p.id === "reddit" && <span>{redditName || "Reddit Subreddit"}</span>}
                    {p.id === "pinterest" && <span>{pinterestName || "Pinterest Board"}</span>}
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

                  {/* DEV.to connect — token input */}
                  {p.id === "devto" && (
                    <div className="conn-form">
                      <input
                        className="conn-input"
                        type="password"
                        placeholder="Paste your DEV.to API Key (or starts with mock_)"
                        value={devtoApiKey}
                        onChange={(e) => setDevtoApiKey(e.target.value)}
                      />
                      <button
                        className="btn-primary"
                        onClick={testDevto}
                        disabled={devtoTesting}
                        style={{ background: "#000" }}
                      >
                        {devtoTesting ? "Verifying…" : "Connect DEV.to 📝"}
                      </button>
                      {devtoMsg && (
                        <p className={`conn-msg conn-msg--${devtoMsg.type}`}>{devtoMsg.text}</p>
                      )}
                    </div>
                  )}

                  {/* Reddit connect — token and subreddit input */}
                  {p.id === "reddit" && (
                    <div className="conn-form">
                      <input
                        className="conn-input"
                        placeholder="Target Subreddit name (e.g. test)"
                        value={redditSubreddit}
                        onChange={(e) => setRedditSubreddit(e.target.value)}
                      />
                      <input
                        className="conn-input"
                        type="password"
                        placeholder="Reddit Access Token (or starts with mock_)"
                        value={redditToken}
                        onChange={(e) => setRedditToken(e.target.value)}
                      />
                      <button
                        className="btn-primary"
                        onClick={testReddit}
                        disabled={redditTesting}
                        style={{ background: "#ff4500" }}
                      >
                        {redditTesting ? "Verifying…" : "Connect Reddit 🤖"}
                      </button>
                      {redditMsg && (
                        <p className={`conn-msg conn-msg--${redditMsg.type}`}>{redditMsg.text}</p>
                      )}
                    </div>
                  )}

                  {/* Pinterest connect — token and board input */}
                  {p.id === "pinterest" && (
                    <div className="conn-form">
                      <input
                        className="conn-input"
                        placeholder="Pinterest Board ID"
                        value={pinterestBoardId}
                        onChange={(e) => setPinterestBoardId(e.target.value)}
                      />
                      <input
                        className="conn-input"
                        type="password"
                        placeholder="Pinterest Access Token (or starts with mock_)"
                        value={pinterestToken}
                        onChange={(e) => setPinterestToken(e.target.value)}
                      />
                      <button
                        className="btn-primary"
                        onClick={testPinterest}
                        disabled={pinterestTesting}
                        style={{ background: "#bd081c" }}
                      >
                        {pinterestTesting ? "Verifying…" : "Connect Pinterest 📌"}
                      </button>
                      {pinterestMsg && (
                        <p className={`conn-msg conn-msg--${pinterestMsg.type}`}>{pinterestMsg.text}</p>
                      )}
                    </div>
                  )}

                  {/* X.com — redirect to auth flow */}
                  {p.id === "x" && (
                    <div className="conn-form">
                      <a 
                        href={`/api/x/connect?workspaceId=${activeWorkspaceId}`} 
                        className="btn-primary conn-oauth-btn"
                        style={{ display: "block", textAlign: "center", textDecoration: "none" }}
                      >
                        Connect X / Twitter 𝕏
                      </a>
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

                  {/* Facebook Pages — redirect to Meta connect */}
                  {p.id === "facebook" && (
                    <div className="conn-form">
                      <a 
                        href={`/api/meta/connect?workspaceId=${activeWorkspaceId}&scope=facebook`} 
                        className="btn-primary conn-oauth-btn"
                        style={{ display: "block", textAlign: "center", textDecoration: "none", background: "#1877f2" }}
                      >
                        Connect Facebook Pages 📘
                      </a>
                    </div>
                  )}

                  {/* Instagram Business — redirect to Meta connect */}
                  {p.id === "instagram" && (
                    <div className="conn-form">
                      <a 
                        href={`/api/meta/connect?workspaceId=${activeWorkspaceId}&scope=instagram`} 
                        className="btn-primary conn-oauth-btn"
                        style={{ display: "block", textAlign: "center", textDecoration: "none", background: "#e1306c" }}
                      >
                        Connect Instagram Business 📸
                      </a>
                    </div>
                  )}

                  {/* Meta Threads — redirect to Meta connect */}
                  {p.id === "threads" && (
                    <div className="conn-form">
                      <a 
                        href={`/api/meta/connect?workspaceId=${activeWorkspaceId}&scope=threads`} 
                        className="btn-primary conn-oauth-btn"
                        style={{ display: "block", textAlign: "center", textDecoration: "none", background: "#000000" }}
                      >
                        Connect Meta Threads 🌀
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
            { icon: "💼", name: "Slack", note: "Webhook connection" },
            { icon: "💬", name: "Discord", note: "Rich text integrations" },
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
