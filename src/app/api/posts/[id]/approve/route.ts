import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Fetch post and check workspace
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        workspace: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Verify user is an ADMIN in the workspace
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: post.workspaceId,
        userId: (session.user as any).id,
      },
    });

    if (!member || member.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can approve posts." },
        { status: 403 }
      );
    }

    // Update status to SCHEDULED (if has future date) or APPROVED (for immediate publish)
    const updatedStatus = post.scheduledFor && new Date(post.scheduledFor) > new Date()
      ? "SCHEDULED"
      : "APPROVED";

    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        status: updatedStatus,
        error: null, // Clear any previous errors/rejections
      },
    });

    return NextResponse.json({
      success: true,
      post: updatedPost,
    });

  } catch (error) {
    console.error("Approve Post Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
