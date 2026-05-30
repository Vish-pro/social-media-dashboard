"use client";

import React, { useState, useEffect, useRef } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import "./ChannelFilter.css";

interface Channel {
  id: string;
  platform: string;
  accountName: string;
  image: string | null;
}

interface Props {
  selectedChannels: Set<string>;
  onChange: (channels: Set<string>) => void;
}

export default function ChannelFilter({ selectedChannels, onChange }: Props) {
  const { activeWorkspaceId } = useWorkspace();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeWorkspaceId) {
      setChannels([]);
      onChange(new Set());
      return;
    }
    fetch(`/api/channels?workspaceId=${activeWorkspaceId}`)
      .then((r) => r.json())
      .then((d) => setChannels(d.channels ?? []))
      .catch(() => {});
  }, [activeWorkspaceId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleChannel = (id: string) => {
    const newSet = new Set(selectedChannels);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onChange(newSet);
  };

  return (
    <div className="cal-dropdown-container" ref={dropdownRef}>
      <button 
        className={`btn-secondary posts-filter-btn ${selectedChannels.size > 0 ? "active-filter" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedChannels.size === 0 ? "Channels" : `${selectedChannels.size} Channels`} ▾
      </button>
      {isOpen && (
        <div className="cal-dropdown-menu">
          {channels.length === 0 ? (
            <div className="cal-dropdown-empty">No channels connected</div>
          ) : (
            channels.map((ch) => (
              <label key={ch.id} className="cal-dropdown-item">
                <input 
                  type="checkbox" 
                  checked={selectedChannels.has(ch.id)}
                  onChange={() => toggleChannel(ch.id)}
                />
                {ch.image ? (
                  <img src={ch.image} alt="" className="cal-dropdown-avatar" />
                ) : (
                  <div className="cal-dropdown-avatar-placeholder" />
                )}
                <span className="cal-dropdown-name">{ch.accountName}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
