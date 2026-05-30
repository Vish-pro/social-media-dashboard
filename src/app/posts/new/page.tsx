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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    
    fetch(`/api/youtube/stats?workspaceId=${activeWorkspaceId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.connected && data.channel) {
          const ch: Channel = {
            id: "youtube",
            name: data.channel.name,
            thumbnail: data.channel.thumbnail,
          };
          setChannels([ch]);
          setSelectedChannels(["youtube"]);
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

  const handleShare = async () => {
    setSubmitting(true);
    try {
      if (!activeWorkspaceId) {
        alert("Please select a workspace");
        setSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append("title", content.slice(0, 100));
      formData.append("description", content);
      if (mediaFiles[0]) {
        formData.append("file", mediaFiles[0]);
      }

      const res = await fetch(`/api/youtube/upload?workspaceId=${activeWorkspaceId}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        if (!createAnother) window.location.href = "/posts";
        else {
          setContent("");
          setMediaFiles([]);
          setMediaPreviews([]);
        }
      } else {
        alert("Error: " + data.error);
      }
    } catch {
      alert("Failed to post.");
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
            <select>
              <option>Next Available</option>
              <option>Schedule for later</option>
              <option>Share now</option>
            </select>
          </div>
          <button
            className="btn-primary share-btn"
            onClick={handleShare}
            disabled={submitting || !content.trim()}
            title={!content.trim() ? "Write some content to share" : ""}
          >
            {submitting ? "Posting…" : "Share Now →"}
          </button>
        </div>
      </div>
    </div>
  );
}
