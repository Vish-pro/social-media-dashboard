import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { google } from "googleapis";

// Global in-memory cache for video metrics
interface VideoMetricsCacheEntry {
  views: number;
  likes: number;
  comments: number;
  timestamp: number;
}
const videoMetricsCache = new Map<string, VideoMetricsCacheEntry>();
const METRICS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ posts: [] });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status"); // "SCHEDULED" | "PUBLISHED" | "DRAFT" etc.
  const channels = searchParams.get("channels"); // comma-separated channel IDs

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  const where: Record<string, unknown> = {
    workspaceId,
  };

  if (channels) {
    const channelIds = channels.split(",");
    if (channelIds.length > 0) {
      where.socialAccountId = { in: channelIds };
    }
  }

  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setDate(toDate.getDate() + 1);
      range.lt = toDate;
    }
    where.scheduledFor = range;
  }

  if (status) {
    where.status = status;
  }

  const posts = await prisma.post.findMany({
    where,
    include: { socialAccount: true },
    orderBy: { scheduledFor: "asc" },
  });

  const postsWithMetrics = posts.map(post => {
    return {
      ...post,
      metrics: null as { views: number; likes: number; comments: number } | null
    };
  });

  // Fetch real YouTube statistics for published videos
  const ytPosts = postsWithMetrics.filter(
    p => p.socialAccount?.platform.toLowerCase() === "youtube" && p.status === "PUBLISHED"
  );

  const videoIdsToQuery = [];
  const postMapByVideoId = {};

  for (const post of ytPosts) {
    if (post.platformSettings) {
      try {
        const settings = typeof post.platformSettings === "string"
          ? JSON.parse(post.platformSettings)
          : post.platformSettings;
        if (settings.videoId) {
          const vid = settings.videoId;
          
          // Check if cached and fresh
          const cached = videoMetricsCache.get(vid);
          if (cached && Date.now() - cached.timestamp < METRICS_CACHE_TTL) {
            post.metrics = {
              views: cached.views,
              likes: cached.likes,
              comments: cached.comments,
            };
          } else {
            videoIdsToQuery.push(vid);
            if (!postMapByVideoId[vid]) {
              postMapByVideoId[vid] = [];
            }
            postMapByVideoId[vid].push(post);
          }
        }
      } catch {}
    }
  }

  if (videoIdsToQuery.length > 0) {
    const account = await prisma.socialAccount.findFirst({
      where: { workspaceId, platform: "youtube" }
    });

    if (account?.accessToken) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
        );
        oauth2Client.setCredentials({
          access_token: account.accessToken,
          refresh_token: account.refreshToken,
        });

        const youtube = google.youtube({ version: "v3", auth: oauth2Client });
        const videoListRes = await youtube.videos.list({
          id: videoIdsToQuery,
          part: ["statistics"]
        });

        const videoItems = videoListRes.data.items || [];
        for (const item of videoItems) {
          const stats = item.statistics;
          const matchedPosts = postMapByVideoId[item.id];
          if (stats) {
            const metrics = {
              views: Number(stats.viewCount ?? 0),
              likes: Number(stats.likeCount ?? 0),
              comments: Number(stats.commentCount ?? 0),
            };

            // Cache the metrics
            videoMetricsCache.set(item.id, {
              ...metrics,
              timestamp: Date.now(),
            });

            if (matchedPosts) {
              for (const post of matchedPosts) {
                post.metrics = metrics;
              }
            }
          }
        }
      } catch (err) {
        console.error("Error fetching real YouTube stats for posts:", err);
      }
    }
  }

  return NextResponse.json({ posts: postsWithMetrics });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let content = "";
    let title = "";
    let workspaceId = "";
    let scheduledFor = "";
    let status = "DRAFT";
    let channelIds = [];
    let mediaUrls = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      content = formData.get("content") as string;
      title = formData.get("title") as string || "";
      workspaceId = formData.get("workspaceId") as string;
      scheduledFor = formData.get("scheduledFor") as string;
      status = formData.get("status") as string || "DRAFT";
      
      const channelsRaw = formData.get("channelIds") as string;
      if (channelsRaw) {
        channelIds = JSON.parse(channelsRaw);
      }

      const platformsRaw = formData.get("platforms") as string;
      if (platformsRaw && channelIds.length === 0) {
        const platforms = JSON.parse(platformsRaw) as string[];
        const dbAccounts = await prisma.socialAccount.findMany({
          where: {
            workspaceId,
            platform: { in: platforms }
          },
          select: { id: true }
        });
        channelIds = dbAccounts.map(a => a.id);
      }

      const file = formData.get("file") as File;
      if (file && file.size > 0) {
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, filename);
        
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await writeFile(filePath, buffer);
        
        mediaUrls.push(`/uploads/${filename}`);
      }
    } else {
      const json = await req.json();
      content = json.content;
      title = json.title || "";
      workspaceId = json.workspaceId;
      scheduledFor = json.scheduledFor;
      status = json.status || "DRAFT";
      channelIds = json.channelIds || [];
      mediaUrls = json.mediaUrls || [];

      if (json.platforms && channelIds.length === 0) {
        const dbAccounts = await prisma.socialAccount.findMany({
          where: {
            workspaceId,
            platform: { in: json.platforms }
          },
          select: { id: true }
        });
        channelIds = dbAccounts.map(a => a.id);
      }
    }

    if (!workspaceId || !content) {
      return NextResponse.json({ error: "workspaceId and content are required" }, { status: 400 });
    }

    // Check membership
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: (session.user as any).id,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Forbidden: You are not a member of this workspace" }, { status: 403 });
    }

    const role = member.role; // "ADMIN" or "CONTRIBUTOR"

    // Set post status based on role and request
    let finalStatus = "DRAFT";
    if (status !== "DRAFT") {
      if (role === "CONTRIBUTOR") {
        finalStatus = "PENDING_APPROVAL";
      } else {
        finalStatus = status === "PUBLISHED" ? "PUBLISHED" : (scheduledFor ? "SCHEDULED" : "APPROVED");
      }
    }

    const scheduledDate = scheduledFor ? new Date(scheduledFor) : null;

    // Create inside transaction
    const result = await prisma.$transaction(async (tx) => {
      const postGroup = await tx.postGroup.create({
        data: {
          workspaceId,
          content,
          mediaUrls: mediaUrls,
          scheduledFor: scheduledDate,
        },
      });

      const posts = [];
      if (channelIds && channelIds.length > 0) {
        for (const channelId of channelIds) {
          const account = await tx.socialAccount.findUnique({
            where: { id: channelId },
            select: { platform: true }
          });

          const isQueuePlatform = account?.platform.toLowerCase() === "youtube";
          const postStatus = isQueuePlatform
            ? (finalStatus === "PUBLISHED" ? "APPROVED" : finalStatus)
            : finalStatus;

          const post = await tx.post.create({
            data: {
              workspaceId,
              socialAccountId: channelId,
              postGroupId: postGroup.id,
              status: postStatus,
              scheduledFor: scheduledDate,
              content: content,
              mediaUrls: mediaUrls,
              platformSettings: title ? { title, description: content } : undefined,
            },
          });
          posts.push(post);
        }
      }

      return { postGroup, posts };
    });

    return NextResponse.json({
      success: true,
      postGroupId: result.postGroup.id,
      postsCount: result.posts.length,
      status: finalStatus,
    });
  } catch (error) {
    console.error("Create Post Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Something went wrong" }, { status: 500 });
  }
}

