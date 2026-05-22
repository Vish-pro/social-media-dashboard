import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import dns from "dns/promises";

async function isSafeUrl(urlStr: string) {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;

    const hostname = url.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "[::1]" || hostname.endsWith(".local") || hostname.endsWith(".internal");

    const lookupResult = await dns.lookup(hostname);
    const ip = lookupResult.address;

    const isPrivateIP = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|0\.|169\.254\.)/.test(ip) || ip === "0.0.0.0";
    const isIPv6Private = ip === "::1" || ip === "::" || ip.toLowerCase().startsWith("fe80:") || ip.toLowerCase().startsWith("fc00:") || ip.toLowerCase().startsWith("fd00:");

    return !isLocalhost && !isPrivateIP && !isIPv6Private;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await prisma.account.findFirst({
      where: {
        userId: (session.user as any).id,
        provider: "google",
      },
    });

    if (!account?.access_token) {
      return NextResponse.json(
        { error: "YouTube account not connected. Please sign in with Google." },
        { status: 400 }
      );
    }

    const { title, description, videoUrl } = await req.json();

    if (!title || !videoUrl) {
      return NextResponse.json(
        { error: "title and videoUrl are required" },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    );

    oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
    });

    // Persist refreshed tokens back to the database automatically
    oauth2Client.on("tokens", async (tokens) => {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          ...(tokens.access_token && { access_token: tokens.access_token }),
          ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
          ...(tokens.expiry_date && {
            expires_at: Math.floor(tokens.expiry_date / 1000),
          }),
        },
      });
    });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    const safeUrl = await isSafeUrl(videoUrl);
    if (!safeUrl) {
      return NextResponse.json(
        { error: "Invalid or unsafe video URL provided." },
        { status: 400 }
      );
    }

    // Fetch the video from the provided URL and stream it directly to YouTube
    // Use manual redirect to prevent redirect-based SSRF bypasses
    const videoResponse = await fetch(videoUrl, { redirect: "manual" });
    if (!videoResponse.ok || !videoResponse.body) {
      return NextResponse.json(
        { error: "Failed to fetch video from the provided URL" },
        { status: 400 }
      );
    }

    const videoStream = Readable.fromWeb(videoResponse.body as any);

    const uploadResponse = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title,
          description: description ?? "",
          categoryId: "22", // People & Blogs
        },
        status: {
          privacyStatus: "private",
        },
      },
      media: {
        mimeType: "video/*",
        body: videoStream,
      },
    });

    const videoId = uploadResponse.data.id;

    return NextResponse.json({
      success: true,
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    });
  } catch (error) {
    console.error("YouTube Upload Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
