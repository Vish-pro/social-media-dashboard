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
    const body = await req.json().catch(() => ({}));
    const feedback = body.feedback || "Rejected by Administrator";

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
        { error: "Forbidden: Only administrators can reject posts." },
        { status: 403 }
      );
    }

    // Update status back to DRAFT and record feedback
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        status: "DRAFT",
        error: feedback, // Save feedback in the error column
      },
    });

    return NextResponse.json({
      success: true,
      post: updatedPost,
    });

  } catch (error) {
    console.error("Reject Post Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
