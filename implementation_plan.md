# Full-Stack Social Media Dashboard Roadmap

This plan takes the application from basic setup to a live, multi-workspace deployment handling YouTube API integrations, scheduling, and shared inboxes.

> **Project Credentials Note:** The Google Cloud Project and YouTube API keys are tied to the account: `vavvyclothing@gmail.com`

## Phase 1: Local Setup & API Validation
- [x] **Initialize the Repository**: Set up Next.js local project environment.
- [ ] **Endpoint Testing**: Set up Google Cloud Console and get YouTube API credentials.
- [x] **Database Provisioning**: Set up local SQLite database (`dev.db`).

## Phase 2: Database Architecture & Workspaces
- [ ] **Design the Schema**: Create core relational tables using an ORM (Prisma/Drizzle):
  - `Users`, `Workspaces`, `Workspace_Members`, `Social_Accounts`, `Posts`.
- [ ] **Authentication**: Implement secure login system (NextAuth/Auth.js or Supabase Auth).

## Phase 3: The Core Composer & UI
- [ ] **Build the Shell**: Create persistent sidebar navigation and Workspace Switcher dropdown.
- [ ] **The Composer Interface**: Build unified text area and media uploader.
- [ ] **Notification Publishing**: Implement logic to toggle between Auto-Publish and Mobile Notification (for Reels with music).
- [ ] **Drafts & Approvals UI**: Create view for Contributor "Pending Approval" and Admin "Approve/Reject".

## Phase 4: API Integration & Publishing Engine
- [ ] **OAuth Flow**: Build "Connect YouTube" logic using Google OAuth to securely store refresh/access tokens.
- [ ] **The Publishing Function**: Write backend API route to upload video using `googleapis` (YouTube Data API v3).
- [ ] **The Scheduler**: Implement cron job (Vercel Cron/Upstash) to trigger publishing for scheduled YouTube videos.

## Phase 5: The Shared Inbox & Deployment
- [ ] **Webhook Integration**: Configure Meta Webhooks to send HTTP POST for comments/DMs.
- [ ] **Inbox UI**: Build three-pane interface to read, assign, and reply to webhooks.
- [ ] **Vercel Deployment**: Deploy live application with production environment variables.
