import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ connected: false });
    }

    const url = new URL(req.url);
    const workspaceId = url.searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ connected: false });
    }

    const account = await prisma.socialAccount.findFirst({
      where: { workspaceId, platform: "youtube" },
    });

    if (!account?.accessToken) {
      return NextResponse.json({ connected: false });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    );

    oauth2Client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
    });

    oauth2Client.on("tokens", async (tokens) => {
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          ...(tokens.access_token && { accessToken: tokens.access_token }),
          ...(tokens.refresh_token && { refreshToken: tokens.refresh_token }),
          ...(tokens.expiry_date && {
            expiresAt: Math.floor(tokens.expiry_date / 1000),
          }),
        },
      });
    });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    const channelRes = await youtube.channels.list({
      part: ["snippet", "statistics"],
      mine: true,
    });

    const channel = channelRes.data.items?.[0];
    if (!channel) {
      return NextResponse.json({ connected: true, noChannel: true });
    }

    const stats = channel.statistics;

    // Fetch 7-day analytics (requires yt-analytics.readonly scope)
    const today = new Date();
    const endDate = today.toISOString().split("T")[0];
    const startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    let chartData: { day: string; views: number; subscribers: number }[] = [];

    try {
      const analyticsAPI = google.youtubeAnalytics({
        version: "v2",
        auth: oauth2Client,
      });
      const analyticsRes = await analyticsAPI.reports.query({
        ids: "channel==MINE",
        startDate,
        endDate,
        metrics: "views,subscribersGained",
        dimensions: "day",
        sort: "day",
      });

      chartData = (analyticsRes.data.rows ?? []).map((row: unknown[]) => ({
        day: String(row[0]),
        views: Number(row[1]),
        subscribers: Number(row[2]),
      }));
    } catch {
      // Analytics scope not yet granted — chart falls back to empty state
    }

    return NextResponse.json({
      connected: true,
      channel: {
        id: channel.id,
        name: channel.snippet?.title ?? "",
        thumbnail: channel.snippet?.thumbnails?.default?.url ?? "",
        subscriberCount: Number(stats?.subscriberCount ?? 0),
        viewCount: Number(stats?.viewCount ?? 0),
        videoCount: Number(stats?.videoCount ?? 0),
        commentCount: Number(stats?.commentCount ?? 0),
      },
      chartData,
    });
  } catch (error) {
    console.error("YouTube Stats Error:", error);
    return NextResponse.json({ connected: false, error: error instanceof Error ? error.message : "Something went wrong" });
  }
}
