import { NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const workspaceIdFromUrl = url.searchParams.get("state"); // We passed workspaceId as state

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }
    const userId = (session.user as any).id;

    // Validate or find a real workspaceId in the database for this user
    let finalWorkspaceId = workspaceIdFromUrl;
    let workspaceExists = false;

    if (finalWorkspaceId && !finalWorkspaceId.startsWith("demo-")) {
      const ws = await prisma.workspace.findFirst({
        where: {
          id: finalWorkspaceId,
          members: { some: { userId } }
        }
      });
      if (ws) {
        workspaceExists = true;
      }
    }

    if (!workspaceExists) {
      // Fallback: Find user's first real workspace
      let userWorkspace = await prisma.workspace.findFirst({
        where: { members: { some: { userId } } }
      });

      // If they don't have one, create one
      if (!userWorkspace) {
        userWorkspace = await prisma.workspace.create({
          data: {
            name: "Personal Workspace",
            members: { create: { userId, role: "ADMIN" } }
          }
        });
      }

      finalWorkspaceId = userWorkspace.id;
    }

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
        workspaceId: finalWorkspaceId!,
        accountName: name,
        image: image,
      },
      create: {
        platform: "youtube",
        accountId: providerAccountId,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : null,
        workspaceId: finalWorkspaceId!,
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

