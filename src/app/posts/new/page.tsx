"use client";

import React, { useState, useRef, useEffect } from "react";
// Auth bypassed — demo mode
import { useWorkspace } from "@/contexts/WorkspaceContext";
import "./Composer.css";

// Supported platforms — icon, color, and which API to call
const PLATFORMS = [
  { id: "bluesky",  label: "Bluesky",  icon: "🦋", color: "#0085ff" },
  { id: "linkedin", label: "LinkedIn", icon: "in", color: "#0077b5" },
  { id: "medium",   label: "Medium",   icon: "M",  color: "#000000" },
  { id: "youtube",  label: "YouTube",  icon: "▶",  color: "#ff0000" },
];

interface PublishResult {
  platform: string;
  ok: boolean;
  msg: string;
}

export default function NewPost() {
  const { activeWorkspaceId } = useWorkspace();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState(""); // for Medium
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [connections, setConnections] = useState<Record<string, any>>({});
  const [mediaPreviews, setMediaPreviews] = useState<{ url: string; type: string }[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
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
    fetch(`/api/youtube/stats?workspaceId=${activeWorkspaceId}`)
      .then((r) => r.json())
      .then((d) => {
        const updatedConn = { ...localConn };
        const updatedConnected = [...localConnected];

        if (d.connected && d.channel) {
          updatedConn.youtube = { name: d.channel.name };
          if (!updatedConnected.includes("youtube")) {
            updatedConnected.push("youtube");
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
    Array.from(files).forEach((file) => {
      setMediaFiles((p) => [...p, file]);
      setMediaPreviews((p) => [...p, { url: URL.createObjectURL(file), type: file.type }]);
    });
  };

  const removeMedia = (i: number) => {
    setMediaPreviews((p) => p.filter((_, j) => j !== i));
    setMediaFiles((p) => p.filter((_, j) => j !== i));
  };


  const handleShare = async (isDraft: boolean = false) => {
    setSubmitting(true);
    setPublishResults([]);

    if (!content.trim()) {
      alert("Write some content before publishing.");
      setSubmitting(false);
      return;
    }
    if (selectedPlatforms.length === 0) {
      alert("Select at least one platform to publish to.");
      setSubmitting(false);
      return;
    }

    const results: PublishResult[] = [];

    // Publish to each selected platform
    for (const platformId of selectedPlatforms) {
      const conn = connections[platformId];
      if (!conn) continue;

      try {
        if (platformId === "bluesky") {
          const res = await fetch("/api/bluesky/post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              identifier: conn.handle,
              appPassword: conn.appPassword,
              text: content.slice(0, 300), // Bluesky 300 char limit
            }),
          });
          const data = await res.json();
          results.push({ platform: "Bluesky", ok: res.ok, msg: res.ok ? "Posted! 🦋" : data.error });
        }

        if (platformId === "linkedin") {
          const res = await fetch("/api/linkedin/post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken: conn.token, text: content }),
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
              title: title.trim() || "SocialPulse Post",
              content,
              status: isDraft ? "draft" : "public",
            }),
          });
          const data = await res.json();
          results.push({ platform: "Medium", ok: res.ok, msg: res.ok ? `Published: ${data.url}` : data.error });
        }

        if (platformId === "youtube") {
          results.push({ platform: "YouTube", ok: true, msg: "Video queued for immediate public upload..." });
        }
      } catch {
        results.push({ platform: platformId, ok: false, msg: "Network error." });
      }
    }

    // Also save to local post queue regardless
    if (activeWorkspaceId) {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("workspaceId", activeWorkspaceId);
      formData.append("platforms", JSON.stringify(selectedPlatforms));
      formData.append("status", isDraft ? "DRAFT" : "PUBLISHED");
      if (scheduleType === "schedule" && scheduledDate) {
        formData.append("scheduledFor", scheduledDate);
      }
      if (mediaFiles[0]) formData.append("file", mediaFiles[0]);

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
      setMediaFiles([]);
      setMediaPreviews([]);
      setScheduledDate("");
      setScheduleType("now");
      setPublishResults([]);
    }
  };

  const remaining = 300 - content.length; // tightest limit is Bluesky

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

          {/* Medium needs a title */}
          {selectedPlatforms.includes("medium") && (
            <input
              className="compose-textarea"
              placeholder="Title for Medium article (required)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ minHeight: "unset", height: "44px", marginBottom: "8px", fontSize: "1rem", fontWeight: 600 }}
            />
          )}

          {/* Textarea */}
          <textarea
            className="compose-textarea"
            placeholder="Start writing your post… (Bluesky: max 300 chars)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={selectedPlatforms.includes("medium") ? 50000 : 2200}
          />

          {/* Uploaded media thumbnails */}
          {mediaPreviews.length > 0 && (
            <div className="media-tiles">
              {mediaPreviews.map((item, i) => (
                <div key={i} className="media-tile">
                  {item.type.startsWith("video/") ? (
                    <video src={item.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                  ) : (
                    <img src={item.url} alt="" />
                  )}
                  <button className="media-tile-rm" onClick={() => removeMedia(i)} aria-label="Remove media">✕</button>
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
              {remaining >= 0 ? remaining : `+${Math.abs(remaining)} over Bluesky limit`}
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
            {content || mediaPreviews.length > 0 ? (
              <div className="preview-card">
                <div className="preview-card-top">
                  <div className="preview-avatar preview-avatar-ph">V</div>
                  <div>
                    <div className="preview-name">Vishwanath</div>
                    <div className="preview-time">Just now</div>
                  </div>
                </div>
                {mediaPreviews[0] && (
                  mediaPreviews[0].type.startsWith("video/") ? (
                    <video src={mediaPreviews[0].url} className="preview-media" controls muted />
                  ) : (
                    <img src={mediaPreviews[0].url} alt="media" className="preview-media" />
                  )
                )}
                {title && selectedPlatforms.includes("medium") && (
                  <p className="preview-caption" style={{ fontWeight: 700, fontSize: "1rem" }}>{title}</p>
                )}
                {content && (
                  <p className="preview-caption">
                    {content.length > 200 ? content.slice(0, 200) + "…" : content}
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
          <div className="schedule-select">
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
            disabled={submitting || !content.trim()}
            style={{ marginRight: "8px", padding: "10px 18px" }}
          >
            Save as Draft
          </button>
          <button
            className="btn-primary share-btn"
            onClick={() => handleShare(false)}
            disabled={submitting || !content.trim()}
            title={!content.trim() ? "Write some content to share" : ""}
          >
            {submitting ? "Publishing…" : scheduleType === "schedule" ? "Schedule Post 📅" : "Publish Post 🚀"}
          </button>
        </div>
      </div>
    </div>
  );
}
