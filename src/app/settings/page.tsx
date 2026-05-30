"use client";

import React, { useEffect, useState, useCallback } from "react";
// Auth bypassed — demo mode
import { useWorkspace } from "@/contexts/WorkspaceContext";
import "./settings.css";

interface Member {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string | null; image: string | null };
}

export default function SettingsPage() {
  // Demo mode: treat current user as admin
  const myUserId = "demo-user";
  const isAdmin = true;

  const { activeWorkspace, activeWorkspaceId, refetch, workspaces, setActiveWorkspaceId } =
    useWorkspace();

  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Rename
  const [renameName, setRenameName] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameMsg, setRenameMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Invite
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("CONTRIBUTOR");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadMembers = useCallback(() => {
    if (!activeWorkspaceId) return;
    setMembersLoading(true);
    fetch(`/api/workspaces/${activeWorkspaceId}/members`)
      .then((r) => r.json())
      .then((d) => {
        setMembers(d.members ?? []);
        setMembersLoading(false);
      })
      .catch(() => setMembersLoading(false));
  }, [activeWorkspaceId]);

  useEffect(() => {
    loadMembers();
    setRenameName(activeWorkspace?.name ?? "");
    setRenameMsg(null);
    setInviteMsg(null);
    setDeleteConfirm("");
  }, [activeWorkspaceId, activeWorkspace, loadMembers]);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameName.trim() || !activeWorkspaceId) return;
    setRenameLoading(true);
    setRenameMsg(null);
    const res = await fetch(`/api/workspaces/${activeWorkspaceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameName.trim() }),
    });
    const data = await res.json();
    setRenameLoading(false);
    if (res.ok) {
      refetch();
      setRenameMsg({ type: "ok", text: "Workspace renamed!" });
    } else {
      setRenameMsg({ type: "err", text: data.error ?? "Failed" });
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeWorkspaceId) return;
    setInviteLoading(true);
    setInviteMsg(null);
    const res = await fetch(`/api/workspaces/${activeWorkspaceId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    const data = await res.json();
    setInviteLoading(false);
    if (res.ok) {
      setInviteEmail("");
      loadMembers();
      setInviteMsg({ type: "ok", text: `${data.member.user.name ?? inviteEmail} added!` });
    } else {
      setInviteMsg({ type: "err", text: data.error ?? "Failed" });
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!activeWorkspaceId) return;
    await fetch(`/api/workspaces/${activeWorkspaceId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    loadMembers();
  }

  async function handleDelete() {
    if (!activeWorkspaceId || deleteConfirm !== activeWorkspace?.name) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/workspaces/${activeWorkspaceId}`, { method: "DELETE" });
    if (res.ok) {
      refetch();
      const remaining = workspaces.filter((w) => w.id !== activeWorkspaceId);
      if (remaining.length > 0) setActiveWorkspaceId(remaining[0].id);
    }
    setDeleteLoading(false);
  }

  function getInitials(name: string) {
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1 className="page-title">Workspace Settings</h1>
        <p className="page-subtitle">
          Manage <strong>{activeWorkspace?.name}</strong> — members, name, and more.
        </p>
      </div>

      <div className="settings-grid">
        {/* ── General ── */}
        <section className="settings-card">
          <h2 className="settings-card-title">General</h2>

          <form onSubmit={handleRename} className="settings-form">
            <label className="settings-label">Workspace name</label>
            <div className="settings-row">
              <input
                id="workspace-rename-input"
                className="input-field"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                maxLength={50}
                disabled={!isAdmin}
              />
              <button
                id="btn-rename-workspace"
                type="submit"
                className="btn-primary"
                disabled={renameLoading || !isAdmin || renameName.trim() === activeWorkspace?.name}
              >
                {renameLoading ? "Saving…" : "Save"}
              </button>
            </div>
            {renameMsg && (
              <p className={`settings-msg settings-msg-${renameMsg.type}`}>{renameMsg.text}</p>
            )}
            {!isAdmin && (
              <p className="settings-hint">Only admins can rename the workspace.</p>
            )}
          </form>
        </section>

        {/* ── Members ── */}
        <section className="settings-card">
          <h2 className="settings-card-title">Members</h2>

          {isAdmin && (
            <form onSubmit={handleInvite} className="settings-form">
              <label className="settings-label">Invite by email</label>
              <div className="settings-row">
                <input
                  id="invite-email-input"
                  type="email"
                  className="input-field"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <select
                  id="invite-role-select"
                  className="input-field settings-role-select"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="CONTRIBUTOR">Contributor</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button
                  id="btn-invite-member"
                  type="submit"
                  className="btn-primary"
                  disabled={inviteLoading || !inviteEmail.trim()}
                >
                  {inviteLoading ? "…" : "Invite"}
                </button>
              </div>
              {inviteMsg && (
                <p className={`settings-msg settings-msg-${inviteMsg.type}`}>{inviteMsg.text}</p>
              )}
            </form>
          )}

          <div className="members-list">
            {membersLoading ? (
              <p className="settings-hint">Loading members…</p>
            ) : (
              members.map((m) => (
                <div key={m.id} className="member-row">
                  <div className="member-avatar">
                    {m.user.image ? (
                      <img src={m.user.image} alt={m.user.name ?? ""} className="member-img" />
                    ) : (
                      <div className="member-initials">
                        {getInitials(m.user.name ?? m.user.email ?? "?")}
                      </div>
                    )}
                  </div>
                  <div className="member-info">
                    <span className="member-name">{m.user.name ?? "—"}</span>
                    <span className="member-email">{m.user.email}</span>
                  </div>
                  <span className={`member-role-badge ${m.role === "ADMIN" ? "badge-admin" : "badge-contributor"}`}>
                    {m.role}
                  </span>
                  {isAdmin && m.user.id !== myUserId && (
                    <button
                      className="btn-remove"
                      onClick={() => handleRemoveMember(m.user.id)}
                      title="Remove member"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── Danger Zone ── */}
        {isAdmin && (
          <section className="settings-card settings-danger-zone">
            <h2 className="settings-card-title danger-title">Danger Zone</h2>
            <p className="settings-hint">
              Deleting a workspace is permanent. All posts, accounts, and data will be removed.
            </p>
            <label className="settings-label" style={{ marginTop: "16px" }}>
              Type <strong>{activeWorkspace?.name}</strong> to confirm
            </label>
            <div className="settings-row">
              <input
                id="delete-confirm-input"
                className="input-field"
                placeholder={activeWorkspace?.name}
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
              />
              <button
                id="btn-delete-workspace"
                className="btn-danger"
                disabled={deleteLoading || deleteConfirm !== activeWorkspace?.name}
                onClick={handleDelete}
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
