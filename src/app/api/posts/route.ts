import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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

  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let content = "";
    let workspaceId = "";
    let scheduledFor = "";
    let status = "DRAFT";
    let channelIds: string[] = [];
    let mediaUrls: string[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      content = formData.get("content") as string;
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

