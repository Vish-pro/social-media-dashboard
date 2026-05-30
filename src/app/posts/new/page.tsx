"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import "./Composer.css";

interface Channel {
  id: string;
  name: string;
  thumbnail: string;
}

export default function NewPost() {
  const { data: session } = useSession();
  const { activeWorkspaceId } = useWorkspace();
  const [content, setContent] = useState("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [createAnother, setCreateAnother] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scheduleType, setScheduleType] = useState<"now" | "schedule">("now");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activeWorkspaceId) {
      setChannels([]);
      setSelectedChannels([]);
      return;
    }
    
    fetch(`/api/channels?workspaceId=${activeWorkspaceId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.channels && data.channels.length > 0) {
          const formatted = data.channels.map((c: any) => ({
            id: c.id,
            name: c.accountName,
            thumbnail: c.image,
            platform: c.platform,
          }));
          setChannels(formatted);
          setSelectedChannels(formatted.map((c: any) => c.id));
        } else {
          setChannels([]);
          setSelectedChannels([]);
        }
      })
      .catch(() => {});
  }, [activeWorkspaceId]);

  const toggleChannel = (id: string) =>
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      setMediaFiles((p) => [...p, file]);
      setMediaPreviews((p) => [...p, URL.createObjectURL(file)]);
    });
  };

  const removeMedia = (i: number) => {
    setMediaPreviews((p) => p.filter((_, j) => j !== i));
    setMediaFiles((p) => p.filter((_, j) => j !== i));
  };

  const handleShare = async (isDraft: boolean = false) => {
    setSubmitting(true);
    try {
      if (!activeWorkspaceId) {
        alert("Please select a workspace");
        setSubmitting(false);
        return;
      }

      if (selectedChannels.length === 0) {
        alert("Please select at least one channel");
        setSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append("content", content);
      formData.append("workspaceId", activeWorkspaceId);
      formData.append("channelIds", JSON.stringify(selectedChannels));
      formData.append("status", isDraft ? "DRAFT" : "PUBLISHED");
      
      if (scheduleType === "schedule" && scheduledDate) {
        formData.append("scheduledFor", scheduledDate);
      }

      if (mediaFiles[0]) {
        formData.append("file", mediaFiles[0]);
      }

      const res = await fetch(`/api/posts`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        if (!createAnother) {
          window.location.href = "/posts";
        } else {
          setContent("");
          setMediaFiles([]);
          setMediaPreviews([]);
          setScheduledDate("");
          setScheduleType("now");
        }
      } else {
        alert("Error: " + data.error);
      }
    } catch {
      alert("Failed to save post.");
    } finally {
      setSubmitting(false);
    }
  };

  const remaining = 2200 - content.length;

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
          {/* Channel pills */}
          <div className="channel-pills">
            {channels.map((ch) => (
              <button
                key={ch.id}
                className={`channel-pill ${selectedChannels.includes(ch.id) ? "selected" : ""}`}
                onClick={() => toggleChannel(ch.id)}
                title={ch.name}
              >
                {ch.thumbnail ? (
                  <img src={ch.thumbnail} alt={ch.name} className="pill-avatar" />
                ) : (
                  <div className="pill-avatar pill-no-img">▶</div>
                )}
                <span className="pill-yt-badge">▶</span>
              </button>
            ))}
            {channels.length === 0 && (
              <a href="/" className="pill-connect">+ Connect a channel</a>
            )}
          </div>

          {/* Textarea */}
          <textarea
            className="compose-textarea"
            placeholder="Start writing your post..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2200}
          />

          {/* Uploaded media thumbnails */}
          {mediaPreviews.length > 0 && (
            <div className="media-tiles">
              {mediaPreviews.map((src, i) => (
                <div key={i} className="media-tile">
                  <img src={src} alt="" />
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
            <span className={`char-count ${remaining < 200 ? "warn" : ""}`}>
              {remaining}
            </span>
          </div>
        </div>

        {/* Right: post preview */}
        <div className="preview-panel">
          <div className="preview-header">
            <span className="preview-header-title">Post Previews</span>
            <span className="preview-info">ⓘ</span>
          </div>

          <div className="preview-body">
            {content || mediaPreviews.length > 0 ? (
              <div className="preview-card">
                <div className="preview-card-top">
                  {channels[0]?.thumbnail ? (
                    <img
                      src={channels[0].thumbnail}
                      alt="avatar"
                      className="preview-avatar"
                    />
                  ) : (
                    <div className="preview-avatar preview-avatar-ph">
                      {session?.user?.name?.[0] ?? "Y"}
                    </div>
                  )}
                  <div>
                    <div className="preview-name">
                      {channels[0]?.name ?? session?.user?.name ?? "Your Channel"}
                    </div>
                    <div className="preview-time">Just now</div>
                  </div>
                </div>
                {mediaPreviews[0] && (
                  <img src={mediaPreviews[0]} alt="media" className="preview-media" />
                )}
                {content && (
                  <p className="preview-caption">
                    {content.length > 200 ? content.slice(0, 200) + "…" : content}
                  </p>
                )}
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
            {submitting ? "Processing…" : scheduleType === "schedule" ? "Schedule Post 📅" : "Publish Post 🚀"}
          </button>
        </div>
      </div>
    </div>
  );
}
