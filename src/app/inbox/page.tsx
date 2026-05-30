"use client";

import React, { useState } from "react";
import "./inbox.css";

interface Message {
  id: string;
  sender: "incoming" | "outgoing";
  text: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  platform: "youtube" | "instagram" | "threads" | "messenger";
  lastMessage: string;
  time: string;
  unread: boolean;
  email: string;
  location: string;
  messages: Message[];
}

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "1",
    name: "Aarav Sharma",
    handle: "@aarav_sharma",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    platform: "instagram",
    lastMessage: "Hey, loved your latest reel! When is the next one coming out?",
    time: "2m ago",
    unread: true,
    email: "aarav.sharma@gmail.com",
    location: "Mumbai, India",
    messages: [
      { id: "m1", sender: "incoming", text: "Hi! I absolutely loved your latest reel about full-stack dashboard setups!", timestamp: "6:30 PM" },
      { id: "m2", sender: "outgoing", text: "Thank you so much Aarav! Really appreciate the kind words.", timestamp: "6:32 PM" },
      { id: "m3", sender: "incoming", text: "Hey, loved your latest reel! When is the next one coming out?", timestamp: "7:08 PM" },
    ],
  },
  {
    id: "2",
    name: "Ananya Patel",
    handle: "Ananya Patel (Channel)",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    platform: "youtube",
    lastMessage: "Can you review my post scheduling code? It throws an error on publish.",
    time: "45m ago",
    unread: true,
    email: "ananya.patel@yahoo.com",
    location: "Bangalore, India",
    messages: [
      { id: "m4", sender: "incoming", text: "Hi there! I am trying to connect my YouTube API to your scheduler tool.", timestamp: "5:12 PM" },
      { id: "m5", sender: "outgoing", text: "Hello Ananya! Make sure your refresh tokens have offline access configured.", timestamp: "5:15 PM" },
      { id: "m6", sender: "incoming", text: "Can you review my post scheduling code? It throws an error on publish.", timestamp: "6:25 PM" },
    ],
  },
  {
    id: "3",
    name: "Vihaan Gupta",
    handle: "@vihaan_g",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    platform: "threads",
    lastMessage: "Is the new workspace switcher UI open source?",
    time: "2h ago",
    unread: false,
    email: "vihaan.g@outlook.com",
    location: "New Delhi, India",
    messages: [
      { id: "m7", sender: "incoming", text: "Wow, the new dashboard switcher layout looks extremely sleek!", timestamp: "4:10 PM" },
      { id: "m8", sender: "outgoing", text: "Thanks Vihaan! Spent a lot of time crafting the dropdown aesthetics.", timestamp: "4:12 PM" },
      { id: "m9", sender: "incoming", text: "Is the new workspace switcher UI open source?", timestamp: "5:00 PM" },
    ],
  },
  {
    id: "4",
    name: "Diya Iyer",
    handle: "Diya Iyer",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
    platform: "messenger",
    lastMessage: "Awesome! Thanks for the quick support.",
    time: "1d ago",
    unread: false,
    email: "diya.iyer@gmail.com",
    location: "Chennai, India",
    messages: [
      { id: "m10", sender: "incoming", text: "Do you offer multi-brand workspaces under the basic subscription tier?", timestamp: "Yesterday 2:10 PM" },
      { id: "m11", sender: "outgoing", text: "Yes! The basic tier supports up to 3 workspaces.", timestamp: "Yesterday 2:15 PM" },
      { id: "m12", sender: "incoming", text: "Awesome! Thanks for the quick support.", timestamp: "Yesterday 2:20 PM" },
    ],
  },
];

const PLATFORM_ICONS: Record<string, string> = {
  youtube: "▶",
  instagram: "📷",
  threads: "𝕋",
  messenger: "📬",
};

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeId, setActiveId] = useState<string>("1");
  const [replyText, setReplyText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const activeChat = conversations.find((c) => c.id === activeId) || conversations[0];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeChat) return;

    const newMessage: Message = {
      id: `m-new-${Date.now()}`,
      sender: "outgoing",
      text: replyText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeChat.id) {
          return {
            ...c,
            lastMessage: replyText.trim(),
            time: "Just now",
            unread: false,
            messages: [...c.messages, newMessage],
          };
        }
        return c;
      })
    );

    setReplyText("");
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.handle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="inbox-page">
      {/* ── Pane 1: Conversations List ── */}
      <div className="inbox-sidebar">
        <div className="inbox-sidebar-header">
          <h3 className="inbox-sidebar-title">Shared Inbox</h3>
          <span style={{ fontSize: "12px", background: "var(--accent-dim)", padding: "4px 8px", borderRadius: "12px", color: "var(--accent)", fontWeight: "600" }}>
            {conversations.filter(c => c.unread).length} Unread
          </span>
        </div>
        
        <div className="inbox-search">
          <input
            type="text"
            className="inbox-search-input"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="inbox-threads-list">
          {filteredConversations.map((c) => (
            <button
              key={c.id}
              className={`inbox-thread-item ${c.id === activeId ? "active" : ""}`}
              onClick={() => {
                setActiveId(c.id);
                // Mark as read on click
                setConversations(prev =>
                  prev.map(p => p.id === c.id ? { ...p, unread: false } : p)
                );
              }}
            >
              <div className="thread-avatar-container">
                <img src={c.avatar} alt={c.name} className="thread-avatar" />
                <span className="thread-platform-badge" style={{
                  background: c.platform === "instagram" ? "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" : c.platform === "youtube" ? "#ef4444" : "#000",
                  color: "#fff"
                }}>
                  {PLATFORM_ICONS[c.platform]}
                </span>
              </div>

              <div className="thread-info">
                <div className="thread-header-row">
                  <span className="thread-name" style={{ fontWeight: c.unread ? "700" : "600" }}>{c.name}</span>
                  <span className="thread-time">{c.time}</span>
                </div>
                <div className="thread-snippet" style={{ fontWeight: c.unread ? "600" : "400", color: c.unread ? "var(--text)" : "var(--text-muted)" }}>
                  {c.lastMessage}
                </div>
              </div>
            </button>
          ))}
          {filteredConversations.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>
              No conversations found.
            </div>
          )}
        </div>
      </div>

      {/* ── Pane 2: Message Center ── */}
      {activeChat ? (
        <div className="inbox-chat">
          <div className="inbox-chat-header">
            <img src={activeChat.avatar} alt={activeChat.name} className="active-chat-avatar" />
            <div>
              <div className="active-chat-name">{activeChat.name}</div>
              <div className="active-chat-status">● Active via {activeChat.platform.toUpperCase()}</div>
            </div>
          </div>

          <div className="inbox-messages-container">
            {activeChat.messages.map((m) => (
              <div key={m.id} className={`message-bubble-wrapper ${m.sender}`}>
                <div className="message-bubble">
                  {m.text}
                </div>
                <span className="message-meta">{m.timestamp}</span>
              </div>
            ))}
          </div>

          <div className="inbox-chat-input-area">
            <form onSubmit={handleSend} className="inbox-compose-row">
              <input
                type="text"
                className="inbox-compose-textarea"
                placeholder={`Reply to ${activeChat.name}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <button type="submit" className="inbox-send-btn">
                Send Reply
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="inbox-empty-view">
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>📬</div>
          <p>Select a conversation from the list to start responding.</p>
        </div>
      )}

      {/* ── Pane 3: Customer Context ── */}
      {activeChat && (
        <div className="inbox-details">
          <img src={activeChat.avatar} alt={activeChat.name} className="details-avatar" />
          <h4 className="details-name">{activeChat.name}</h4>
          <span className="details-handle">{activeChat.handle}</span>

          <div className="details-info-section">
            <h5 className="details-info-title">Sender Context</h5>
            
            <div className="details-info-item">
              <span className="details-info-label">Email</span>
              <span className="details-info-val">{activeChat.email}</span>
            </div>

            <div className="details-info-item">
              <span className="details-info-label">Location</span>
              <span className="details-info-val">{activeChat.location}</span>
            </div>

            <div className="details-info-item">
              <span className="details-info-label">Platform</span>
              <span className="details-info-val" style={{ textTransform: "capitalize" }}>{activeChat.platform}</span>
            </div>

            <div className="details-info-item">
              <span className="details-info-label">Status</span>
              <span className="details-info-val" style={{ color: "var(--success)" }}>Active User</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
