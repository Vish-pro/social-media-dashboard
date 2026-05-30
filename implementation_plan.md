# Full-Stack Social Media Dashboard Roadmap

This plan takes the application from basic setup to a live, multi-workspace deployment handling YouTube API integrations, scheduling, and shared inboxes.

> **Project Credentials Note:** The Google Cloud Project and YouTube API keys are tied to the account: `vavvyclothing@gmail.com`

## Phase 1: Local Setup & API Validation
- [x] **Initialize the Repository**: Set up Next.js local project environment.
- [x] **Endpoint Testing**: Set up Google Cloud Console and get YouTube API credentials.
- [x] **Database Provisioning**: Set up Neon PostgreSQL database.

## Phase 2: Database Architecture & Workspaces
- [x] **Design the Schema**: Core relational tables — Users, Workspaces, WorkspaceMembers, SocialAccounts, PostGroups, Posts.
- [x] **Authentication**: Google OAuth via NextAuth v4 + PrismaAdapter. Sign-in page, session gate, sign-out.
- [x] **Workspace Switcher**: Custom dropdown in Sidebar with initials avatar, active state, inline create, settings link.
- [x] **Workspace Settings Page**: Rename, invite by email (admin-only), member list with roles, remove member, type-to-confirm delete.
- [x] **Workspace APIs**: GET/POST /api/workspaces, PATCH/DELETE /api/workspaces/[id], GET/POST/DELETE /api/workspaces/[id]/members.

## Phase 3: The Core Composer & UI
- [ ] **Post Composer**: Unified text area + media uploader + platform toggles + schedule picker.
- [ ] **Drafts & Approvals UI**: Contributor "Pending Approval" and Admin "Approve/Reject" views.

## Phase 4: API Integration & Publishing Engine
- [ ] **YouTube OAuth Flow**: "Connect YouTube" using Google OAuth, store refresh/access tokens.
- [ ] **Publishing Function**: Backend API route to upload video via googleapis (YouTube Data API v3).
- [ ] **Scheduler**: Cron job to trigger publishing for scheduled YouTube videos.

## Phase 5: The Shared Inbox & Deployment
- [ ] **Webhook Integration**: Configure Meta Webhooks for comments/DMs.
- [ ] **Inbox UI**: Three-pane interface to read, assign, and reply.
- [ ] **Vercel Deployment**: Deploy with production environment variables.

