import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

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
    orderBy: { scheduledFor: "asc" },
  });

  return NextResponse.json({ posts });
}
