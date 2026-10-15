"use client";

import React, { useState, useRef, useEffect } from "react";
// Auth bypassed — demo mode
import { useWorkspace } from "@/contexts/WorkspaceContext";
import "./Composer.css";

// Supported platforms — icon, color, and which API to call
const PLATFORMS = [
  { id: "x",         label: "X / Twitter", icon: "𝕏", color: "#000000" },
  { id: "bluesky",   label: "Bluesky",  icon: "🦋", color: "#0085ff" },
  { id: "linkedin",  label: "LinkedIn", icon: "in", color: "#0077b5" },
  { id: "medium",    label: "Medium",   icon: "M",  color: "#000000" },
  { id: "youtube",   label: "YouTube",  icon: "▶",  color: "#ff0000" },
  { id: "facebook",  label: "Facebook", icon: "📘", color: "#1877f2" },
  { id: "instagram", label: "Instagram",icon: "📸", color: "#e1306c" },
  { id: "threads",   label: "Threads",  icon: "🌀", color: "#000000" },
  { id: "devto",     label: "DEV.to",   icon: "📝", color: "#000000" },
  { id: "reddit",    label: "Reddit",   icon: "🤖", color: "#ff4500" },
  { id: "pinterest", label: "Pinterest",icon: "📌", color: "#bd081c" },
];

interface PublishResult {
  platform: string;
  ok: boolean;
  msg: string;
}

export default function NewPost() {
  const { activeWorkspaceId } = useWorkspace();
  const [content, setContent] = useState("");
  const [threadTweets, setThreadTweets] = useState<string[]>([""]);

  const [isCustomized, setIsCustomized] = useState(false);
  const [customizedContent, setCustomizedContent] = useState<Record<string, string>>({});
  const [customizedTitle, setCustomizedTitle] = useState<Record<string, string>>({});
  const [customizedThreads, setCustomizedThreads] = useState<Record<string, string[]>>({});
  const [activeCustomPlatform, setActiveCustomPlatform] = useState<string | null>(null);

  const enableCustomization = () => {
    const nextContent: Record<string, string> = {};
    const nextTitle: Record<string, string> = {};
    const nextThreads: Record<string, string[]> = {};

    selectedPlatforms.forEach((platformId) => {
      nextContent[platformId] = content;
      nextTitle[platformId] = title;
      if (platformId === "x") {
        const initialThread = [...threadTweets];
        if (initialThread.length === 1 && !initialThread[0]) {
          initialThread[0] = content;
        }
        nextThreads[platformId] = initialThread;
        // Seed first tweet to content copy as well
        nextContent[platformId] = initialThread[0] || content;
      }
    });

    setCustomizedContent(nextContent);
    setCustomizedTitle(nextTitle);
    setCustomizedThreads(nextThreads);
    setIsCustomized(true);
    if (selectedPlatforms.length > 0) {
      setActiveCustomPlatform(selectedPlatforms[0]);
    }
  };

  const updateThreadTweet = (index: number, val: string) => {
    setThreadTweets((prev) => {
      const next = [...prev];
      next[index] = val;
      if (index === 0) {
        setContent(val);
      }
      return next;
    });
  };

  const addThreadTweet = () => {
    setThreadTweets((prev) => [...prev, ""]);
  };

  const removeThreadTweet = (index: number) => {
    setThreadTweets((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (index === 0 && next[0]) {
        setContent(next[0]);
      }
      return next;
    });
  };

  const [title, setTitle] = useState(""); // for Medium
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [connections, setConnections] = useState<Record<string, any>>({});
  const [mediaPreviews, setMediaPreviews] = useState<{ url: string; type: string }[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [createAnother, setCreateAnother] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scheduleType, setScheduleType] = useState<"now" | "schedule">("now");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [publishResults, setPublishResults] = useState<PublishResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read connected platforms from localStorage + fetch YouTube from DB
  useEffect(() => {
    let localConnected: string[] = [];
    let localConn: Record<string, any> = {};

    const saved = localStorage.getItem("socialpulse_connections");
    if (saved) {
      try {
        localConn = JSON.parse(saved);
        localConnected = Object.keys(localConn);
      } catch {}
    }

    if (!activeWorkspaceId) {
      setConnections(localConn);
      setConnectedPlatforms(localConnected);
      setSelectedPlatforms(localConnected);
      return;
    }

    // Check YouTube connected status in DB
    fetch(`/api/channels?workspaceId=${activeWorkspaceId}`)
      .then((r) => r.json())
      .then((d) => {
        const updatedConn = { ...localConn };
        const updatedConnected = [...localConnected];

        // Find youtube platform connection from channels database list
        const ytChannel = d.channels?.find((c: any) => c.platform === "youtube");

        if (ytChannel) {
          updatedConn.youtube = { name: ytChannel.accountName };
          if (!updatedConnected.includes("youtube")) {
            updatedConnected.push("youtube");
          }
        }

        // Find X.com platform connection from channels database list
        const xChannel = d.channels?.find((c: any) => c.platform === "x");

        if (xChannel) {
          updatedConn.x = { name: xChannel.accountName };
          if (!updatedConnected.includes("x")) {
            updatedConnected.push("x");
          }
        }

        // Find Facebook platform connection from channels database list
        const fbChannel = d.channels?.find((c: any) => c.platform === "facebook");

        if (fbChannel) {
          updatedConn.facebook = { name: fbChannel.accountName };
          if (!updatedConnected.includes("facebook")) {
            updatedConnected.push("facebook");
          }
        }

        // Find Instagram platform connection from channels database list
        const igChannel = d.channels?.find((c: any) => c.platform === "instagram");

        if (igChannel) {
          updatedConn.instagram = { name: igChannel.accountName };
          if (!updatedConnected.includes("instagram")) {
            updatedConnected.push("instagram");
          }
        }

        // Find Threads platform connection from channels database list
        const thChannel = d.channels?.find((c: any) => c.platform === "threads");

        if (thChannel) {
          updatedConn.threads = { name: thChannel.accountName };
          if (!updatedConnected.includes("threads")) {
            updatedConnected.push("threads");
          }
        }

        // Find DEV.to platform connection from channels database list
        const devtoChannel = d.channels?.find((c: any) => c.platform === "devto");

        if (devtoChannel) {
          updatedConn.devto = { name: devtoChannel.accountName };
          if (!updatedConnected.includes("devto")) {
            updatedConnected.push("devto");
          }
        }

        // Find Reddit platform connection from channels database list
        const redditChannel = d.channels?.find((c: any) => c.platform === "reddit");

        if (redditChannel) {
          updatedConn.reddit = { name: redditChannel.accountName };
          if (!updatedConnected.includes("reddit")) {
            updatedConnected.push("reddit");
          }
        }

        // Find Pinterest platform connection from channels database list
        const pinterestChannel = d.channels?.find((c: any) => c.platform === "pinterest");

        if (pinterestChannel) {
          updatedConn.pinterest = { name: pinterestChannel.accountName };
          if (!updatedConnected.includes("pinterest")) {
            updatedConnected.push("pinterest");
          }
        }

        setConnections(updatedConn);
        setConnectedPlatforms(updatedConnected);
        setSelectedPlatforms((prev) => {
          // Keep existing selections but make sure all connected ones are selected initially if empty
          const next = [...prev];
          updatedConnected.forEach((c) => {
            if (!next.includes(c)) next.push(c);
          });
          return next;
        });
      })
      .catch((err) => {
        console.error("Error checking YouTube connection in composer:", err);
        setConnections(localConn);
        setConnectedPlatforms(localConnected);
        setSelectedPlatforms(localConnected);
      });
  }, [activeWorkspaceId]);

  const togglePlatform = (id: string) =>
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const startIndex = mediaPreviews.length;
    Array.from(files).forEach((file) => {
      setMediaFiles((p) => [...p, file]);
      setMediaPreviews((p) => [...p, { url: URL.createObjectURL(file), type: file.type }]);
    });
    setActiveMediaIndex(startIndex);
  };

  const removeMedia = (i: number) => {
    setMediaPreviews((p) => p.filter((_, j) => j !== i));
    setMediaFiles((p) => p.filter((_, j) => j !== i));
    setActiveMediaIndex((prev) => {
      if (prev >= mediaPreviews.length - 1) {
        return Math.max(0, mediaPreviews.length - 2);
      }
      return prev;
    });
  };


  const getPlatformCharLimit = (platformId: string) => {
    switch (platformId) {
      case "facebook": return 63206;
      case "instagram": return 2200;
      case "threads": return 500;
      case "bluesky": return 300;
      case "youtube": return 5000;
      case "medium": return 50000;
      case "devto": return 50000;
      case "reddit": return 40000;
      case "pinterest": return 500;
      case "x": return 280;
      default: return 2200;
    }
  };

  const getPlatformContent = (platformId: string) => {
    return isCustomized ? (customizedContent[platformId] || "") : content;
  };

  const getPlatformTitle = (platformId: string) => {
    return isCustomized ? (customizedTitle[platformId] || "") : title;
  };

  const getPlatformThreads = (platformId: string) => {
    return isCustomized ? (customizedThreads[platformId] || [""]) : threadTweets;
  };

  const handleShare = async (isDraft: boolean = false) => {
    setSubmitting(true);
    setPublishResults([]);

    if (selectedPlatforms.length === 0) {
      alert("Select at least one platform to publish to.");
      setSubmitting(false);
      return;
    }

    // Dynamic Validation checks per platform
    for (const platformId of selectedPlatforms) {
      const pContent = getPlatformContent(platformId);
      const pTitle = getPlatformTitle(platformId);
      const pThreads = getPlatformThreads(platformId);

      if (platformId === "x") {
        const threads = isCustomized ? pThreads : threadTweets;
        if (!threads[0]?.trim()) {
          alert("Please write some content for X / Twitter.");
          setSubmitting(false);
          return;
        }
        for (let i = 0; i < threads.length; i++) {
          if (threads[i].length > 280) {
            alert(`X / Twitter tweet #${i + 1} exceeds the 280 character limit.`);
            setSubmitting(false);
            return;
          }
        }
      } else {
        if (!pContent.trim()) {
          alert(`Please write some content for ${PLATFORMS.find(p => p.id === platformId)?.label || platformId}.`);
          setSubmitting(false);
          return;
        }

        if (platformId === "bluesky") {
          if (pContent.length > 300) {
            alert(`Bluesky post exceeds the 300 character limit (currently ${pContent.length} chars).`);
            setSubmitting(false);
            return;
          }
        } else if (platformId === "youtube") {
          if (pContent.length > 5000) {
            alert(`YouTube description exceeds the 5000 character limit (currently ${pContent.length} chars).`);
            setSubmitting(false);
            return;
          }
          if (!pTitle.trim()) {
            alert("YouTube requires a title.");
            setSubmitting(false);
            return;
          }
          if (pTitle.length > 100) {
            alert("YouTube title exceeds the 100 character limit.");
            setSubmitting(false);
            return;
          }
        } else if (platformId === "linkedin") {
          if (pContent.length > 3000) {
            alert(`LinkedIn post exceeds the 3000 character limit (currently ${pContent.length} chars).`);
            setSubmitting(false);
            return;
          }
        } else if (platformId === "facebook") {
          if (pContent.length > 63206) {
            alert(`Facebook post exceeds the 63,206 character limit.`);
            setSubmitting(false);
            return;
          }
        } else if (platformId === "instagram") {
          if (pContent.length > 2200) {
            alert(`Instagram caption exceeds the 2,200 character limit.`);
            setSubmitting(false);
            return;
          }
          if (mediaFiles.length === 0) {
            alert("Instagram requires at least one image or video attachment to publish.");
            setSubmitting(false);
            return;
          }
        } else if (platformId === "threads") {
          if (pContent.length > 500) {
            alert(`Threads post exceeds the 500 character limit.`);
            setSubmitting(false);
            return;
          }
        } else if (platformId === "devto") {
          if (pContent.length > 50000) {
            alert(`DEV.to post exceeds the 50,000 character limit (currently ${pContent.length} chars).`);
            setSubmitting(false);
            return;
          }
        } else if (platformId === "reddit") {
          if (pContent.length > 40000) {
            alert(`Reddit post exceeds the 40,000 character limit.`);
            setSubmitting(false);
            return;
          }
        } else if (platformId === "pinterest") {
          if (pContent.length > 500) {
            alert(`Pinterest Pin description exceeds the 500 character limit.`);
            setSubmitting(false);
            return;
          }
          if (mediaFiles.length === 0) {
            alert("Pinterest strictly requires an image attachment to publish.");
            setSubmitting(false);
            return;
          }
        }
      }
    }

    const results: PublishResult[] = [];

    // Publish to each selected platform immediately
    for (const platformId of selectedPlatforms) {
      const conn = connections[platformId];
      if (!conn) continue;

      const pContent = getPlatformContent(platformId);
      const pTitle = getPlatformTitle(platformId);
      const pThreads = getPlatformThreads(platformId);

      try {
        if (platformId === "bluesky") {
          const res = await fetch("/api/bluesky/post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              identifier: conn.handle,
              appPassword: conn.appPassword,
              text: pContent.slice(0, 300),
            }),
          });
          const data = await res.json();
          results.push({ platform: "Bluesky", ok: res.ok, msg: res.ok ? "Posted! 🦋" : data.error });
        }

        if (platformId === "linkedin") {
          const res = await fetch("/api/linkedin/post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken: conn.token, text: pContent }),
          });
          const data = await res.json();
          results.push({ platform: "LinkedIn", ok: res.ok, msg: res.ok ? "Posted! 💼" : data.error });
        }

        if (platformId === "medium") {
          const res = await fetch("/api/medium/post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              integrationToken: conn.token,
              title: pTitle.trim() || "SocialPulse Post",
              content: pContent,
              status: isDraft ? "draft" : "public",
            }),
          });
          const data = await res.json();
          results.push({ platform: "Medium", ok: res.ok, msg: res.ok ? `Published: ${data.url}` : data.error });
        }

        if (platformId === "youtube") {
          results.push({ platform: "YouTube", ok: true, msg: "Video queued for immediate public upload..." });
        }

        if (platformId === "x") {
          const isThread = pThreads.length > 1;
          const res = await fetch("/api/x/post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspaceId: activeWorkspaceId,
              text: pContent,
              thread: isThread ? pThreads : undefined,
            }),
          });
          const data = await res.json();
          results.push({ platform: "X / Twitter", ok: res.ok, msg: res.ok ? "Tweeted! 𝕏" : data.error });
        }

        if (platformId === "facebook" || platformId === "instagram" || platformId === "threads") {
          const res = await fetch("/api/meta/post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspaceId: activeWorkspaceId,
              platform: platformId,
              text: pContent,
              title: pTitle,
            }),
          });
          results.push({ 
            platform: PLATFORMS.find(p => p.id === platformId)?.label || platformId, 
            ok: res.ok, 
            msg: res.ok ? "Published successfully! 🎉" : data.error 
          });
        }

        if (platformId === "devto") {
          const res = await fetch("/api/devto/post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspaceId: activeWorkspaceId,
              text: pContent,
              title: pTitle || "Posted from SocialPulse",
            }),
          });
          const data = await res.json();
          results.push({
            platform: "DEV.to",
            ok: res.ok,
            msg: res.ok ? "Published to DEV.to! 📝" : data.error,
          });
        }

        if (platformId === "reddit") {
          const res = await fetch("/api/reddit/post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspaceId: activeWorkspaceId,
              text: pContent,
              title: pTitle || "Posted from SocialPulse",
            }),
          });
          const data = await res.json();
          results.push({
            platform: "Reddit",
            ok: res.ok,
            msg: res.ok ? "Published to Reddit! 🤖" : data.error,
          });
        }

        if (platformId === "pinterest") {
          const res = await fetch("/api/pinterest/post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspaceId: activeWorkspaceId,
              text: pContent,
              title: pTitle || "Posted from SocialPulse",
              mediaUrls: mediaPreviews.map((m) => m.url),
            }),
          });
          const data = await res.json();
          results.push({
            platform: "Pinterest",
            ok: res.ok,
            msg: res.ok ? "Pin created on Pinterest! 📌" : data.error,
          });
        }
      } catch {
        results.push({ platform: platformId, ok: false, msg: "Network error." });
      }
    }

    // Also save to local post queue database
    if (activeWorkspaceId) {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("title", title);
      formData.append("workspaceId", activeWorkspaceId);
      formData.append("platforms", JSON.stringify(selectedPlatforms));
      formData.append("status", isDraft ? "DRAFT" : (scheduleType === "schedule" ? "SCHEDULED" : "PUBLISHED"));
      if (scheduleType === "schedule" && scheduledDate) {
        formData.append("scheduledFor", scheduledDate);
      }
      if (mediaFiles[0]) formData.append("file", mediaFiles[0]);

      if (isCustomized) {
        const overridesList = selectedPlatforms.map((platformId) => ({
          platform: platformId,
          content: getPlatformContent(platformId),
          title: getPlatformTitle(platformId),
          thread: platformId === "x" ? getPlatformThreads(platformId) : undefined,
        }));
        formData.append("platformOverrides", JSON.stringify(overridesList));
      } else {
        if (selectedPlatforms.length === 1 && selectedPlatforms[0] === "x" && threadTweets.length > 1) {
          formData.append("thread", JSON.stringify(threadTweets));
        }
      }

      await fetch("/api/posts", { method: "POST", body: formData }).catch(() => {});

      // If YouTube is selected and we are publishing immediately, trigger scheduler now!
      if (selectedPlatforms.includes("youtube") && !isDraft && scheduleType === "now") {
        try {
          const schedRes = await fetch("/api/scheduler/publish");
          const schedData = await schedRes.json();
          if (schedData.success && schedData.processedCount > 0) {
            const ytResult = schedData.results.find((r: any) => r.platform === "youtube");
            const ytIndex = results.findIndex((r) => r.platform === "YouTube");
            if (ytIndex !== -1) {
              if (ytResult && ytResult.success) {
                results[ytIndex] = { platform: "YouTube", ok: true, msg: "Published live to YouTube! 🚀" };
              } else {
                results[ytIndex] = { platform: "YouTube", ok: false, msg: ytResult?.error || "Upload failed." };
              }
            }
          }
        } catch (err) {
          console.error("Immediate YouTube publish trigger failed:", err);
        }
      }
    }

    setPublishResults(results);
    setSubmitting(false);

    const allOk = results.every((r) => r.ok);
    if (allOk && !createAnother) {
      setTimeout(() => (window.location.href = "/posts"), 4000);
    } else if (createAnother && allOk) {
      setContent("");
      setTitle("");
      setThreadTweets([""]);
      setIsCustomized(false);
      setCustomizedContent({});
      setCustomizedTitle({});
      setCustomizedThreads({});
      setActiveCustomPlatform(null);
      setMediaFiles([]);
      setMediaPreviews([]);
      setScheduledDate("");
      setScheduleType("now");
      setPublishResults([]);
    }
  };

  const getMinLimit = () => {
    let min = 2200;
    if (selectedPlatforms.includes("x")) min = Math.min(min, 280);
    if (selectedPlatforms.includes("bluesky")) min = Math.min(min, 300);
    if (selectedPlatforms.includes("threads")) min = Math.min(min, 500);
    if (selectedPlatforms.includes("instagram")) min = Math.min(min, 2200);
    if (selectedPlatforms.includes("youtube")) min = Math.min(min, 5000);
    if (selectedPlatforms.includes("devto")) min = Math.min(min, 50000);
    if (selectedPlatforms.includes("reddit")) min = Math.min(min, 40000);
    if (selectedPlatforms.includes("pinterest")) min = Math.min(min, 500);
    return min;
  };
  const limit = getMinLimit();
  const remaining = limit - content.length;

  return (
    <div className="composer-page">
      {/* ── Top toolbar ── */}
      <div className="composer-toolbar">
        <div className="composer-toolbar-left">
          <h2 className="composer-title">Create Post</h2>
          <button className="ctb-btn">♦ Tags ▾</button>
        </div>
        <div className="composer-toolbar-right">
          <button className="ctb-btn">Templates</button>
          <button className="ctb-btn ctb-ai">✦ AI Assistant</button>
          <button className="ctb-btn ctb-preview">Preview</button>
          <a href="/posts" className="ctb-close" aria-label="Close composer">✕</a>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="composer-body">
        {/* Left: compose */}
        <div className="compose-area">
          {/* Platform selector */}
          <div className="channel-pills">
            {PLATFORMS.map((p) => {
              const isConnected = connectedPlatforms.includes(p.id);
              return (
                <button
                  key={p.id}
                  className={`channel-pill ${selectedPlatforms.includes(p.id) ? "selected" : ""}`}
                  onClick={() => isConnected && togglePlatform(p.id)}
                  title={isConnected ? `Toggle ${p.label}` : `Connect ${p.label} in Connections tab`}
                  style={{ opacity: isConnected ? 1 : 0.38, cursor: isConnected ? "pointer" : "not-allowed" }}
                >
                  <div className="pill-avatar pill-no-img" style={{ background: p.color, color: "#fff", fontSize: "0.8rem", fontWeight: 700 }}>
                    {p.icon}
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text)" }}>{p.label}</span>
                  {!isConnected && <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginTop: "-2px" }}>Not connected</span>}
                </button>
              );
            })}
            {connectedPlatforms.length === 0 && (
              <a href="/connections" className="pill-connect">+ Connect a platform</a>
            )}
          </div>

          {/* Unified Details Box OR Stacked Platform Customized Editor */}
          {!isCustomized ? (
            <div className="video-details-container">
              <h3 className="video-details-heading">
                {selectedPlatforms.includes("youtube") ? "Video details" : "Post details"}
              </h3>
              
              {/* Title field */}
              <div className="details-field-group">
                <div className="details-label-row">
                  <label className="details-label">
                    Title {selectedPlatforms.includes("youtube") || selectedPlatforms.includes("medium") ? "(required)" : "(optional)"}
                  </label>
                  <span className="details-help-icon" title="A catchy title helps your audience find your content.">❓</span>
                </div>
                <input
                  className="details-input"
                  placeholder={
                    selectedPlatforms.includes("youtube")
                      ? "Add a title that describes your video"
                      : "Add a title for your post"
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
                <div className="details-field-footer">
                  <button className="details-hashtag-btn" type="button" onClick={() => setTitle(prev => prev + " #vavvy")}>
                    ✨ Suggested hashtags
                  </button>
                  <span className="details-counter">{title.length}/100</span>
                </div>
              </div>

              {/* Description / Content field OR X Thread Compose Box */}
              {selectedPlatforms.length === 1 && selectedPlatforms[0] === "x" ? (
                <div className="x-thread-editor" style={{ marginTop: "16px", position: "relative" }}>
                  <label className="details-label" style={{ display: "block", marginBottom: "8px", color: "var(--text-muted)" }}>
                    X / Twitter Thread
                  </label>
                  <div className="thread-timeline-line" style={{
                    position: "absolute",
                    left: "17px",
                    top: "54px",
                    bottom: "60px",
                    width: "2px",
                    background: "var(--border)",
                    zIndex: 0
                  }} />
                  {threadTweets.map((tweet, index) => {
                    const remainingChars = 280 - tweet.length;
                    return (
                      <div key={index} className="thread-tweet-node" style={{
                        display: "flex",
                        gap: "12px",
                        position: "relative",
                        zIndex: 1,
                        marginBottom: "16px"
                      }}>
                        <div className="thread-node-avatar" style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: "var(--accent)",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          V
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
                              {index === 0 ? "First Tweet" : `Tweet #${index + 1}`}
                            </span>
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => removeThreadTweet(index)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#ef4444",
                                  cursor: "pointer",
                                  fontSize: "0.75rem"
                                }}
                              >
                                ✕ Remove
                              </button>
                            )}
                          </div>
                          <textarea
                            className="details-textarea"
                            style={{ minHeight: "80px", marginTop: "6px" }}
                            placeholder={index === 0 ? "Start writing your thread..." : "Add another tweet to your thread..."}
                            value={tweet}
                            onChange={(e) => updateThreadTweet(index, e.target.value)}
                            maxLength={280}
                          />
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: "6px"
                          }}>
                            <span style={{ fontSize: "0.75rem", color: tweet.length > 260 ? "#ef4444" : "var(--text-muted)" }}>
                              {tweet.length}/280
                            </span>
                            {index === threadTweets.length - 1 && (
                              <button
                                type="button"
                                onClick={addThreadTweet}
                                className="details-hashtag-btn"
                                style={{ padding: "4px 10px", fontSize: "0.75rem", color: "var(--accent)" }}
                              >
                                ➕ Start Thread / Add Tweet
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="details-field-group" style={{ marginTop: "16px" }}>
                  <div className="details-label-row">
                    <label className="details-label">
                      {selectedPlatforms.includes("youtube") ? "Description" : "Content / Caption"}
                    </label>
                    <span className="details-help-icon" title="Tell your viewers or readers what your post is about.">❓</span>
                  </div>
                  <textarea
                    className="details-textarea"
                    placeholder={
                      selectedPlatforms.includes("youtube")
                        ? "Tell viewers about your video (type @ to mention a channel)"
                        : "Start writing your post content here… (Bluesky: max 300 chars)"
                    }
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    maxLength={selectedPlatforms.includes("medium") ? 50000 : 2200}
                  />
                  <div className="details-field-footer" style={{ justifyContent: "flex-end" }}>
                    <span className="details-counter">
                      {content.length}/{selectedPlatforms.includes("medium") ? "50000" : "2200"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="customized-stacked-container" style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
              {selectedPlatforms.map((platformId) => {
                const p = PLATFORMS.find((pl) => pl.id === platformId);
                if (!p) return null;

                const isActive = activeCustomPlatform === platformId;
                const platformContent = customizedContent[platformId] || "";
                const platformTitle = customizedTitle[platformId] || "";

                if (isActive) {
                  return (
                    <div 
                      key={platformId} 
                      className="customized-active-card" 
                      style={{
                        background: "var(--bg-secondary)",
                        border: `1.5px solid ${p.color}`,
                        borderRadius: "12px",
                        padding: "20px",
                        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
                        width: "100%"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                        <div style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "6px",
                          background: p.color,
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.8rem",
                          fontWeight: 700
                        }}>
                          {p.icon}
                        </div>
                        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>Customize for {p.label}</h4>
                      </div>

                      {/* Render X Thread compose or platform specific textarea */}
                      {platformId === "x" ? (
                        <div className="x-thread-editor" style={{ position: "relative" }}>
                          <div className="thread-timeline-line" style={{
                            position: "absolute",
                            left: "17px",
                            top: "40px",
                            bottom: "50px",
                            width: "2px",
                            background: "var(--border)",
                            zIndex: 0
                          }} />
                          {(customizedThreads["x"] || [""]).map((tweet, index) => {
                            const remainingChars = 280 - tweet.length;
                            return (
                              <div key={index} className="thread-tweet-node" style={{
                                display: "flex",
                                gap: "12px",
                                position: "relative",
                                zIndex: 1,
                                marginBottom: "16px"
                              }}>
                                <div className="thread-node-avatar" style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "50%",
                                  background: p.color,
                                  color: "#fff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.8rem",
                                  fontWeight: 700,
                                  flexShrink: 0
                                }}>
                                  V
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
                                      {index === 0 ? "First Tweet" : `Tweet #${index + 1}`}
                                    </span>
                                    {index > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const next = (customizedThreads["x"] || [""]).filter((_, i) => i !== index);
                                          setCustomizedThreads({ ...customizedThreads, x: next });
                                        }}
                                        style={{
                                          background: "none",
                                          border: "none",
                                          color: "#ef4444",
                                          cursor: "pointer",
                                          fontSize: "0.75rem"
                                        }}
                                      >
                                        ✕ Remove
                                      </button>
                                    )}
                                  </div>
                                  <textarea
                                    className="details-textarea"
                                    style={{ minHeight: "80px", marginTop: "6px" }}
                                    placeholder={index === 0 ? "Start writing your thread..." : "Add another tweet..."}
                                    value={tweet}
                                    onChange={(e) => {
                                      const next = [...(customizedThreads["x"] || [""])];
                                      next[index] = e.target.value;
                                      setCustomizedThreads({ ...customizedThreads, x: next });
                                      if (index === 0) {
                                        setCustomizedContent({ ...customizedContent, x: e.target.value });
                                      }
                                    }}
                                    maxLength={280}
                                  />
                                  <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginTop: "6px"
                                  }}>
                                    <span style={{ fontSize: "0.75rem", color: tweet.length > 260 ? "#ef4444" : "var(--text-muted)" }}>
                                      {tweet.length}/280
                                    </span>
                                    {index === (customizedThreads["x"] || [""]).length - 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const next = [...(customizedThreads["x"] || [""]), ""];
                                          setCustomizedThreads({ ...customizedThreads, x: next });
                                        }}
                                        className="details-hashtag-btn"
                                        style={{ padding: "4px 10px", fontSize: "0.75rem", color: "var(--accent)" }}
                                      >
                                        ➕ Start Thread / Add Tweet
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                          {(platformId === "medium" || platformId === "youtube") && (
                            <div className="details-field-group">
                              <div className="details-label-row">
                                <label className="details-label">
                                  Title (required)
                                </label>
                              </div>
                              <input
                                className="details-input"
                                placeholder={`Enter title for ${p.label}`}
                                value={platformTitle}
                                onChange={(e) => setCustomizedTitle({ ...customizedTitle, [platformId]: e.target.value })}
                                maxLength={100}
                              />
                            </div>
                          )}

                          <div className="details-field-group">
                            <div className="details-label-row">
                              <label className="details-label">
                                {platformId === "youtube" ? "Description" : "Content / Caption"}
                              </label>
                            </div>
                            <textarea
                              className="details-textarea"
                              placeholder={`Start writing your ${p.label} content here...`}
                              value={platformContent}
                              onChange={(e) => setCustomizedContent({ ...customizedContent, [platformId]: e.target.value })}
                              maxLength={getPlatformCharLimit(platformId)}
                            />
                            <div className="details-field-footer" style={{ justifyContent: "flex-end" }}>
                              <span className="details-counter">
                                {platformContent.length}/{getPlatformCharLimit(platformId)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                } else {
                  const collapsedSnippet = platformId === "x" 
                    ? (customizedThreads["x"]?.[0] || "") 
                    : platformContent;
                  return (
                    <div 
                      key={platformId}
                      className="customized-collapsed-card"
                      onClick={() => setActiveCustomPlatform(platformId)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        cursor: "pointer",
                        opacity: 0.85,
                        transition: "opacity 0.2s",
                        width: "100%"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = "0.85"}
                    >
                      <div style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "4px",
                        background: p.color,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.7rem",
                        fontWeight: 700
                      }}>
                        {p.icon}
                      </div>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", flexShrink: 0 }}>
                          {p.label}:
                        </span>
                        <span style={{
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          flex: 1
                        }}>
                          {collapsedSnippet || "(No content written yet)"}
                        </span>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--accent)" }}>Expand ▾</span>
                    </div>
                  );
                }
              })}
            </div>
          )}

          {/* Uploaded media thumbnails */}
          {mediaPreviews.length > 0 && (
            <div className="media-tiles" style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "12px 0" }}>
              {mediaPreviews.map((item, i) => (
                <div 
                  key={i} 
                  className={`media-tile ${activeMediaIndex === i ? "active-thumbnail" : ""}`}
                  onClick={() => setActiveMediaIndex(i)}
                  style={{
                    position: "relative",
                    cursor: "pointer",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: activeMediaIndex === i ? "2px solid var(--accent)" : "1px solid var(--border)",
                    boxShadow: activeMediaIndex === i ? "0 0 8px var(--accent)" : "none",
                    transform: activeMediaIndex === i ? "scale(1.05)" : "scale(1)",
                    transition: "all 0.2s ease"
                  }}
                >
                  {item.type.startsWith("video/") ? (
                    <video src={item.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                  ) : (
                    <img src={item.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                  <button 
                    className="media-tile-rm" 
                    onClick={(e) => { e.stopPropagation(); removeMedia(i); }} 
                    aria-label="Remove media"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Drop zone */}
          <div
            className={`media-drop ${dragOver ? "drag-active" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Upload media files"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <span className="media-drop-icon">📎</span>
            <span>
              Drag & drop or{" "}
              <span className="media-drop-link">select a file</span>
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => addFiles(e.target.files)}
          />

          {/* Compose toolbar */}
          <div className="compose-tools-row">
            <div className="compose-tools">
              <button className="tool-btn" title="Add">+</button>
              <button className="tool-btn" title="More options">↓</button>
              <button className="tool-btn" title="Emoji">😊</button>
              <button className="tool-btn" title="Hashtag">#</button>
            </div>
            <span className={`char-count ${remaining < 50 ? "warn" : ""}`}>
              {remaining >= 0 ? remaining : `+${Math.abs(remaining)} over limit`}
            </span>
          </div>

          {/* Publish results */}
          {publishResults.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
              {publishResults.map((r) => (
                <div
                  key={r.platform}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: "0.8125rem",
                    background: r.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                    color: r.ok ? "#22c55e" : "#ef4444",
                    border: `1px solid ${r.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                  }}
                >
                  <strong>{r.platform}:</strong> {r.msg}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: post preview */}
        <div className="preview-panel">
          <div className="preview-header">
            <span className="preview-header-title">Post Preview</span>
            <span className="preview-info">
              {selectedPlatforms.length > 0
                ? `Posting to: ${selectedPlatforms.map((id) => PLATFORMS.find((p) => p.id === id)?.label).join(", ")}`
                : "No platforms selected"}
            </span>
          </div>

          <div className="preview-body">
            {(isCustomized ? (activeCustomPlatform ? (activeCustomPlatform === "x" ? (customizedThreads["x"]?.[0] || "") : (customizedContent[activeCustomPlatform] || "")) : "") : content) || mediaPreviews.length > 0 ? (
              <div className="preview-card">
                <div className="preview-card-top">
                  <div className="preview-avatar preview-avatar-ph">V</div>
                  <div>
                    <div className="preview-name">Vishwanath</div>
                    <div className="preview-time">Just now</div>
                  </div>
                </div>
                {mediaPreviews[activeMediaIndex] && (
                  mediaPreviews[activeMediaIndex].type.startsWith("video/") ? (
                    <video key={mediaPreviews[activeMediaIndex].url} src={mediaPreviews[activeMediaIndex].url} className="preview-media" controls />
                  ) : (
                    <img src={mediaPreviews[activeMediaIndex].url} alt="media" className="preview-media" />
                  )
                )}
                {isCustomized ? (
                  activeCustomPlatform && (activeCustomPlatform === "medium" || activeCustomPlatform === "youtube") && customizedTitle[activeCustomPlatform] && (
                    <p className="preview-caption" style={{ fontWeight: 700, fontSize: "1rem" }}>{customizedTitle[activeCustomPlatform]}</p>
                  )
                ) : (
                  title && (selectedPlatforms.includes("medium") || selectedPlatforms.includes("youtube")) && (
                    <p className="preview-caption" style={{ fontWeight: 700, fontSize: "1rem" }}>{title}</p>
                  )
                )}
                {(isCustomized ? (activeCustomPlatform ? (activeCustomPlatform === "x" ? (customizedThreads["x"]?.[0] || "") : (customizedContent[activeCustomPlatform] || "")) : "") : content) && (
                  <p className="preview-caption">
                    {(() => {
                      const txt = isCustomized 
                        ? (activeCustomPlatform ? (activeCustomPlatform === "x" ? (customizedThreads["x"]?.[0] || "") : (customizedContent[activeCustomPlatform] || "")) : "")
                        : content;
                      return txt.length > 200 ? txt.slice(0, 200) + "…" : txt;
                    })()}
                  </p>
                )}
                {/* Platform badges */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {selectedPlatforms.map((id) => {
                    const p = PLATFORMS.find((pl) => pl.id === id);
                    return p ? (
                      <span
                        key={id}
                        style={{
                          background: p.color,
                          color: "#fff",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 99,
                        }}
                      >
                        {p.icon} {p.label}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            ) : (
              <div className="preview-empty">
                <div className="preview-placeholder-card">
                  <div className="ph-row">
                    <div className="ph-avatar" />
                    <div className="ph-lines">
                      <div className="ph-line" />
                      <div className="ph-line short" />
                    </div>
                  </div>
                  <div className="ph-thumb" />
                  <div className="ph-add">+</div>
                </div>
                <p className="preview-empty-text">See your post's preview here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer bar ── */}
      <div className="composer-footer">
        <label className="create-another">
          <input
            type="checkbox"
            checked={createAnother}
            onChange={(e) => setCreateAnother(e.target.checked)}
          />
          <span>Create Another</span>
        </label>

        <div className="footer-right">
          {selectedPlatforms.length > 1 && !isCustomized && (
            <button
              type="button"
              className="btn-secondary customize-toggle-btn"
              onClick={enableCustomization}
              style={{
                marginRight: "8px",
                padding: "10px 18px",
                border: "1.5px solid var(--accent)",
                color: "var(--accent)",
                fontWeight: 600,
                background: "transparent",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--accent)";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--accent)";
              }}
            >
              Customize for each network ➔
            </button>
          )}

          {isCustomized && (
            <button
              type="button"
              className="btn-secondary discard-toggle-btn"
              onClick={() => {
                if (window.confirm("Are you sure you want to discard platform overrides and go back to unified editing? Your platform-specific customizations will be lost.")) {
                  setIsCustomized(false);
                }
              }}
              style={{
                marginRight: "8px",
                padding: "10px 18px",
                border: "1.5px solid #ef4444",
                color: "#ef4444",
                fontWeight: 600,
                background: "transparent",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#ef4444";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#ef4444";
              }}
            >
              ✕ Discard Customization
            </button>
          )}

          <div className="schedule-select" style={{ marginRight: "12px" }}>
            <span>📅</span>
            <select value={scheduleType} onChange={(e) => setScheduleType(e.target.value as any)}>
              <option value="now">Share now</option>
              <option value="schedule">Schedule for later</option>
            </select>
            {scheduleType === "schedule" && (
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="schedule-date-input"
                required
                style={{
                  marginLeft: "10px",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  color: "var(--text)",
                  fontFamily: "inherit"
                }}
              />
            )}
          </div>
          <button
            className="btn-secondary draft-btn"
            onClick={() => handleShare(true)}
            disabled={submitting}
            style={{ marginRight: "8px", padding: "10px 18px" }}
          >
            Save as Draft
          </button>
          <button
            className="btn-primary share-btn"
            onClick={() => handleShare(false)}
            disabled={submitting}
          >
            {submitting ? "Publishing…" : scheduleType === "schedule" ? "Schedule Post 📅" : "Publish Post 🚀"}
          </button>
        </div>
      </div>
    </div>
  );
}
