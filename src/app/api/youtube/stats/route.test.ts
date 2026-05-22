import { GET } from "./route";
import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Mock next-auth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

// Mock @/lib/authOptions
jest.mock("@/lib/authOptions", () => ({
  authOptions: {},
}));

// Mock googleapis
jest.mock("googleapis", () => {
  const mOAuth2Client = {
    setCredentials: jest.fn(),
    on: jest.fn(),
  };

  const mYoutubeChannelsList = jest.fn();
  const mYoutube = {
    channels: {
      list: mYoutubeChannelsList,
    },
  };

  const mAnalyticsReportsQuery = jest.fn();
  const mYoutubeAnalytics = {
    reports: {
      query: mAnalyticsReportsQuery,
    },
  };

  return {
    google: {
      auth: {
        OAuth2: jest.fn(() => mOAuth2Client),
      },
      youtube: jest.fn(() => mYoutube),
      youtubeanalytics: jest.fn(() => mYoutubeAnalytics),
    },
  };
});

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    account: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe("GET /api/youtube/stats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it("should return connected: false if no session", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(data).toEqual({ connected: false });
  });

  it("should return connected: false if session but no user", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: null });

    const res = await GET();
    const data = await res.json();

    expect(data).toEqual({ connected: false });
  });

  it("should return connected: false if user has no Google account", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.account.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(data).toEqual({ connected: false });
    expect(prisma.account.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", provider: "google" },
    });
  });

  it("should return connected: false if Google account has no access token", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.account.findFirst as jest.Mock).mockResolvedValue({ access_token: null });

    const res = await GET();
    const data = await res.json();

    expect(data).toEqual({ connected: false });
  });

  it("should return connected: true, noChannel: true if connected but no channel is returned", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.account.findFirst as jest.Mock).mockResolvedValue({
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
    });

    // Mock youtube.channels.list to return empty items
    const youtube = google.youtube({ version: "v3" });
    (youtube.channels.list as jest.Mock).mockResolvedValue({ data: { items: [] } });

    const res = await GET();
    const data = await res.json();

    expect(data).toEqual({ connected: true, noChannel: true });
    expect(youtube.channels.list).toHaveBeenCalledWith({
      part: ["snippet", "statistics"],
      mine: true,
    });
  });

  it("should return channel stats and analytics data on happy path", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.account.findFirst as jest.Mock).mockResolvedValue({
      id: "acc-1",
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
    });

    const mockChannel = {
      id: "channel-1",
      snippet: {
        title: "Test Channel",
        thumbnails: { default: { url: "http://example.com/thumb.jpg" } },
      },
      statistics: {
        subscriberCount: "1000",
        viewCount: "50000",
        videoCount: "10",
        commentCount: "100",
      },
    };

    const youtube = google.youtube({ version: "v3" });
    (youtube.channels.list as jest.Mock).mockResolvedValue({ data: { items: [mockChannel] } });

    // Mock analytics
    const analytics = (google as any).youtubeanalytics({ version: "v2" });
    (analytics.reports.query as jest.Mock).mockResolvedValue({
      data: {
        rows: [
          ["2023-01-01", 100, 5],
          ["2023-01-02", 150, 10],
        ],
      },
    });

    const res = await GET();
    const data = await res.json();

    expect(data).toEqual({
      connected: true,
      channel: {
        id: "channel-1",
        name: "Test Channel",
        thumbnail: "http://example.com/thumb.jpg",
        subscriberCount: 1000,
        viewCount: 50000,
        videoCount: 10,
        commentCount: 100,
      },
      chartData: [
        { day: "2023-01-01", views: 100, subscribers: 5 },
        { day: "2023-01-02", views: 150, subscribers: 10 },
      ],
    });
  });

  it("should return empty chart data if analytics throws an error", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.account.findFirst as jest.Mock).mockResolvedValue({
      id: "acc-1",
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
    });

    const mockChannel = {
      id: "channel-1",
      snippet: {
        title: "Test Channel",
      },
      statistics: {
        subscriberCount: "1000",
      },
    };

    const youtube = google.youtube({ version: "v3" });
    (youtube.channels.list as jest.Mock).mockResolvedValue({ data: { items: [mockChannel] } });

    // Mock analytics to throw error
    const analytics = (google as any).youtubeanalytics({ version: "v2" });
    (analytics.reports.query as jest.Mock).mockRejectedValue(new Error("Scope not granted"));

    const res = await GET();
    const data = await res.json();

    expect(data.chartData).toEqual([]);
    expect(data.channel.name).toBe("Test Channel");
  });

  it("should handle general errors and return connected: false with error message", async () => {
    (getServerSession as jest.Mock).mockRejectedValue(new Error("Session error"));

    const res = await GET();
    const data = await res.json();

    expect(data).toEqual({ connected: false, error: "Session error" });
  });

  it("should handle general errors (non-Error object) and return default message", async () => {
    (getServerSession as jest.Mock).mockRejectedValue("Some weird error");

    const res = await GET();
    const data = await res.json();

    expect(data).toEqual({ connected: false, error: "Something went wrong" });
  });
});
