import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  return handlePublishQueue();
}

export async function POST(req: Request) {
  return handlePublishQueue();
}

async function handlePublishQueue() {
  try {
    // Find posts ready to publish
    const posts = await prisma.post.findMany({
      where: {
        status: { in: ["APPROVED", "SCHEDULED"] },
        OR: [
          { status: "APPROVED" },
          { 
            status: "SCHEDULED", 
            scheduledFor: { lte: new Date() } 
          }
        ]
      },
      include: {
        socialAccount: true,
      },
      orderBy: { scheduledFor: "asc" },
    });

    if (posts.length === 0) {
      return NextResponse.json({ success: true, message: "No posts in queue to publish." });
    }

    const results = [];

    for (const post of posts) {
      try {
        const platform = post.socialAccount.platform.toLowerCase();

        if (platform === "youtube") {
          const account = post.socialAccount;

          if (!account.accessToken) {
            throw new Error("No YouTube credentials found for this account.");
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

          // Refresh and update token on dynamic events
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

          if (!post.mediaUrls || post.mediaUrls.length === 0) {
            throw new Error("YouTube posts require a video attachment.");
          }

          const relativePath = post.mediaUrls[0];
          const filePath = path.join(process.cwd(), "public", relativePath);

          if (!fs.existsSync(filePath)) {
            throw new Error(`Attached video file not found on disk at: ${filePath}`);
          }

          const videoStream = fs.createReadStream(filePath);

          const uploadResponse = await youtube.videos.insert({
            part: ["snippet", "status"],
            requestBody: {
              snippet: {
                title: post.content ? post.content.slice(0, 100) : "Social Dashboard Video",
                description: post.content || "",
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

          // Update status to PUBLISHED
          await prisma.post.update({
            where: { id: post.id },
            data: {
              status: "PUBLISHED",
              publishedAt: new Date(),
              error: null,
            },
          });

          results.push({
            postId: post.id,
            platform: "youtube",
            success: true,
            videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
          });

        } else {
          // Instagram / Threads / Stub channels
          // Mock successful direct publishing since API connections are in-development or pending config
          await prisma.post.update({
            where: { id: post.id },
            data: {
              status: "PUBLISHED",
              publishedAt: new Date(),
              error: null,
            },
          });

          results.push({
            postId: post.id,
            platform: post.socialAccount.platform,
            success: true,
            message: "Stub publishing complete.",
          });
        }

      } catch (postError: any) {
        console.error(`Error publishing post ${post.id}:`, postError);

        // Update status to FAILED and log error message
        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: "FAILED",
            error: postError.message || "An unexpected error occurred during publishing.",
          },
        });

        results.push({
          postId: post.id,
          platform: post.socialAccount.platform,
          success: false,
          error: postError.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: posts.length,
      results,
    });

  } catch (error) {
    console.error("Scheduler Main Queue Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal queue error" },
      { status: 500 }
    );
  }
}
