import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;

    let workspaces = await prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: "asc" },
    });

    if (workspaces.length === 0) {
      const newWorkspace = await prisma.workspace.create({
        data: {
          name: "Personal Workspace",
          members: { create: { userId, role: "ADMIN" } },
        },
      });
      workspaces = [newWorkspace];
    }

    return NextResponse.json({ workspaces });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load workspaces" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;
    const { name } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: name.trim(),
        members: { create: { userId, role: "ADMIN" } },
      },
    });

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }
}

