"use client";

import React, { useState, useEffect, useRef } from "react";
import "./CalendarView.css";

import { useWorkspace } from "@/contexts/WorkspaceContext";

interface Post {
  id: string;
  content: string;
  scheduledFor: string | null;
  mediaUrls: string;
  status: string;
  socialAccountId: string;
}

interface CalendarViewProps {
  selectedChannels: Set<string>;
}

const HOUR_HEIGHT = 64; // px per hour
const START_HOUR = 8;   // 8 AM
const END_HOUR = 22;    // 10 PM
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ── helpers ── */
function startOfWeek(d: Date): Date {
  const s = new Date(d);
  s.setDate(d.getDate() - d.getDay());
  s.setHours(0, 0, 0, 0);
  return s;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function topPx(date: Date): number {
  const h = date.getHours() + date.getMinutes() / 60;
  return Math.max(0, (h - START_HOUR) * HOUR_HEIGHT);
}

function fmtTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function fmtMonthYear(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function fmtLongDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function parseMedia(raw: string): string[] {
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

/* ── component ── */
export default function CalendarView({ selectedChannels }: CalendarViewProps) {
  const { activeWorkspaceId } = useWorkspace();
  const today = new Date();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [posts, setPosts] = useState<Post[]>([]);
  
  const [selected, setSelected] = useState<Post | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  /* fetch posts whenever week or selected channels change */
  useEffect(() => {
    if (!activeWorkspaceId) {
      setPosts([]);
      return;
    }
    const from = weekStart.toISOString().split("T")[0];
    const to = days[6].toISOString().split("T")[0];
    let url = `/api/posts?workspaceId=${activeWorkspaceId}&from=${from}&to=${to}`;
    
    if (selectedChannels.size > 0) {
      url += `&channels=${Array.from(selectedChannels).join(",")}`;
    }

    fetch(url)
      .then((r) => r.json())
      .then((d) => setPosts(d.posts ?? []))
      .catch(() => {});
  }, [weekStart, activeWorkspaceId, selectedChannels]);

  /* scroll to 8 AM on mount */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, []);

  /* navigation */
  const prevWeek = () => setWeekStart((w) => addDays(w, -7));
  const nextWeek = () => setWeekStart((w) => addDays(w, 7));
  const goToday = () => setWeekStart(startOfWeek(today));

  /* current time position */
  const nowTop = topPx(today);
  const isThisWeek = days.some((d) => sameDay(d, today));

  return (
    <div className="cal-root">
      {/* ── Navigation bar ── */}
      <div className="cal-nav">
        <div className="cal-nav-left">
          <button className="cal-arrow" onClick={prevWeek}>‹</button>
          <button className="cal-arrow" onClick={nextWeek}>›</button>
          <span className="cal-month">{fmtMonthYear(weekStart)}</span>
          <button className="cal-today-btn" onClick={goToday}>Today</button>
          <div className="cal-view-pill">Week ▾</div>
        </div>
        <div className="cal-nav-right">
        </div>
      </div>

      {/* ── Day header row ── */}
      <div className="cal-header-row">
        <div className="cal-gutter-spacer" />
        {days.map((day, i) => {
          const isToday = sameDay(day, today);
          return (
            <div key={i} className={`cal-day-header ${isToday ? "is-today" : ""}`}>
              <span className="cal-day-name">{DAY_SHORT[i]}</span>
              <span className={`cal-day-num ${isToday ? "is-today-num" : ""}`}>
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Scrollable time grid ── */}
      <div className="cal-scroll" ref={scrollRef}>
        <div className="cal-grid">
          {/* Time gutter */}
          <div className="cal-time-gutter">
            {HOURS.map((h) => (
              <div key={h} className="cal-time-cell">
                <span className="cal-time-label">
                  {h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => {
            const isToday = sameDay(day, today);
            const dayPosts = posts.filter((p) => {
              if (!p.scheduledFor) return false;
              return sameDay(new Date(p.scheduledFor), day);
            });

            return (
              <div key={di} className={`cal-day-col ${isToday ? "today-col" : ""}`}>
                {/* Hour grid lines */}
                {HOURS.map((h) => (
                  <div key={h} className="cal-hour-line" />
                ))}

                {/* Current time line (today only) */}
                {isToday && isThisWeek && (
                  <div className="cal-now-line" style={{ top: nowTop }}>
                    <div className="cal-now-dot" />
                  </div>
                )}

                {/* Post cards */}
                {dayPosts.map((post) => {
                  const pd = new Date(post.scheduledFor!);
                  const media = parseMedia(post.mediaUrls);
                  const isSelected = selected?.id === post.id;

                  return (
                    <div
                      key={post.id}
                      className={`cal-post-card ${isSelected ? "selected" : ""}`}
                      style={{ top: topPx(pd) }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(isSelected ? null : post);
                      }}
                    >
                      <div className="cal-post-dot yt-dot" />
                      <span className="cal-post-time">{fmtTime(pd)}</span>
                      {media[0] && (
                        <img src={media[0]} alt="" className="cal-post-thumb" />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Post detail popover (click-away to close) ── */}
      {selected && (() => {
        const pd = new Date(selected.scheduledFor!);
        const media = parseMedia(selected.mediaUrls);
        return (
          <>
            <div className="cal-overlay" onClick={() => setSelected(null)} />
            <div className="cal-popover">
              <div className="cal-popover-header">
                <span className="cal-popover-date">{fmtLongDate(pd)} · Custom</span>
                <div className="cal-popover-header-btns">
                  <button className="ctb-icon">⤢</button>
                  <button className="ctb-icon" onClick={() => setSelected(null)}>✕</button>
                </div>
              </div>

              <div className="cal-popover-body">
                <div className="cal-popover-channel">
                  <div className={`cal-popover-avatar ${selected.status}-avatar`}>▶</div>
                  <span className="cal-popover-channel-name">Channel</span>
                </div>

                {media[0] && (
                  <img src={media[0]} alt="media" className="cal-popover-media" />
                )}

                {selected.content && (
                  <p className="cal-popover-caption">
                    {selected.content.length > 120
                      ? selected.content.slice(0, 120) + "…"
                      : selected.content}
                  </p>
                )}
              </div>

              <div className="cal-popover-stats">
                <div className="cal-stat">
                  <span className="cal-stat-label">👍 Reactions</span>
                  <span className="cal-stat-val">0</span>
                </div>
                <div className="cal-stat">
                  <span className="cal-stat-label">💬 Comments</span>
                  <span className="cal-stat-val">0</span>
                </div>
                <div className="cal-stat">
                  <span className="cal-stat-label">📈 Eng. Rate</span>
                  <span className="cal-stat-val">—</span>
                </div>
              </div>

              <div className="cal-popover-footer">
                <button className="cal-view-post-btn">↗ View Post</button>
                <button className="cal-more-btn">⋯</button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
