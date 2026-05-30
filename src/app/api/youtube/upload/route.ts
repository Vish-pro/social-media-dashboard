import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const file = formData.get("file") as File;
    const url = new URL(req.url);
    // Actually, in page.tsx we didn't add workspaceId to the upload URL or formData!
    // I need to update the upload URL in page.tsx as well. Or we can just read it from headers or URL params.
    // Let's read from URL params if available, or throw.
    const workspaceId = url.searchParams.get("workspaceId");

    if (!title || !file || !workspaceId) {
      return NextResponse.json(
        { error: "title, file, and workspaceId are required" },
        { status: 400 }
      );
    }

    const account = await prisma.socialAccount.findFirst({
      where: { workspaceId, platform: "youtube" },
    });

    if (!account?.accessToken) {
      return NextResponse.json(
        { error: "YouTube account not connected for this workspace." },
        { status: 400 }
      );
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

    // Persist refreshed tokens back to the database automatically
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

    // Convert the uploaded file to a Node.js Readable stream
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const videoStream = Readable.from(buffer);

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
