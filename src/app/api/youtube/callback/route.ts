import { NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const workspaceId = url.searchParams.get("state"); // We passed workspaceId as state

  if (!code || !workspaceId) {
    return NextResponse.json({ error: "Missing code or workspaceId" }, { status: 400 });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/youtube/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch the channel info to get providerAccountId (Channel ID) and name
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });
    const response = await youtube.channels.list({
      part: ["snippet"],
      mine: true,
    });

    const channel = response.data.items?.[0];
    if (!channel || !channel.id) {
      return NextResponse.json({ error: "No YouTube channel found for this account" }, { status: 404 });
    }

    const providerAccountId = channel.id;
    const name = channel.snippet?.title || "YouTube Channel";
    const image = channel.snippet?.thumbnails?.default?.url || null;

    // Save to SocialAccount table
    await prisma.socialAccount.upsert({
      where: {
        platform_accountId: {
          platform: "youtube",
          accountId: providerAccountId,
        },
      },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : null,
        workspaceId: workspaceId,
        accountName: name,
        image: image,
      },
      create: {
        platform: "youtube",
        accountId: providerAccountId,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : null,
        workspaceId: workspaceId,
        accountName: name,
        image: image,
      },
    });

    // Redirect back to dashboard
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/`);
  } catch (error) {
    console.error("YouTube OAuth callback error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
