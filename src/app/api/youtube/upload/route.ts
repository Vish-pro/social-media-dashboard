import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

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

    const job = await prisma.uploadJob.create({
      data: {
        userId: (session.user as any).id,
        status: "PENDING",
      },
    });

    after(async () => {
      try {
        // Fetch the video from the provided URL and stream it directly to YouTube
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok || !videoResponse.body) {
          await prisma.uploadJob.update({
            where: { id: job.id },
            data: { status: "FAILED", error: "Failed to fetch video from the provided URL" },
          });
          return;
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

        await prisma.uploadJob.update({
          where: { id: job.id },
          data: {
            status: "COMPLETED",
            videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
          },
        });

      } catch (error) {
        console.error("YouTube Upload Background Error:", error);
        await prisma.uploadJob.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            error: error instanceof Error ? error.message : "Background upload failed",
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: "Upload queued",
    });
  } catch (error) {
    console.error("YouTube Upload Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
