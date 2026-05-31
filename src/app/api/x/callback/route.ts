import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    console.error("X.com OAuth callback error param:", error);
    return NextResponse.json({ error: `Authentication failed: ${error}` }, { status: 400 });
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("x_oauth_state")?.value;
  const codeVerifier = cookieStore.get("x_oauth_verifier")?.value;
  const workspaceIdFromCookie = cookieStore.get("x_oauth_workspace")?.value;

  // Clean up cookies immediately
  cookieStore.delete("x_oauth_state");
  cookieStore.delete("x_oauth_verifier");
  cookieStore.delete("x_oauth_workspace");

  if (!code || !state || !savedState || !codeVerifier) {
    return NextResponse.json({ error: "Invalid request or session expired." }, { status: 400 });
  }

  if (state !== savedState) {
    return NextResponse.json({ error: "State mismatch. Possible CSRF." }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }
    const userId = (session.user as any).id;

    // Validate workspaceId
    let finalWorkspaceId = workspaceIdFromCookie;
    let workspaceExists = false;

    if (finalWorkspaceId) {
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
      let userWorkspace = await prisma.workspace.findFirst({
        where: { members: { some: { userId } } }
      });

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

    const clientId = process.env.X_CLIENT_ID;
    const clientSecret = process.env.X_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/x/callback`;

    // Swap auth code for tokens
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: clientId!,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("X.com token swap error:", errText);
      throw new Error(`Token swap failed: ${errText}`);
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Fetch user details from /2/users/me
    const userRes = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userRes.ok) {
      const errText = await userRes.text();
      console.error("X.com user details fetch error:", errText);
      throw new Error(`User info fetch failed: ${errText}`);
    }

    const userData = await userRes.json();
    const xUser = userData.data;

    if (!xUser || !xUser.id) {
      throw new Error("No user details returned from X.com.");
    }

    const providerAccountId = xUser.id;
    const name = `@${xUser.username}`; // Use handle as the name
    const image = xUser.profile_image_url || null;

    // Save/Upsert in SocialAccount
    await prisma.socialAccount.upsert({
      where: {
        platform_accountId: {
          platform: "x",
          accountId: providerAccountId,
        },
      },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token || null,
        expiresAt: expires_in ? Math.floor(Date.now() / 1000) + expires_in : null,
        workspaceId: finalWorkspaceId!,
        accountName: name,
        image: image,
      },
      create: {
        platform: "x",
        accountId: providerAccountId,
        accessToken: access_token,
        refreshToken: refresh_token || null,
        expiresAt: expires_in ? Math.floor(Date.now() / 1000) + expires_in : null,
        workspaceId: finalWorkspaceId!,
        accountName: name,
        image: image,
      },
    });

    // Redirect to Connections page
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/connections`);
  } catch (error: any) {
    console.error("X.com OAuth callback main error:", error);
    return NextResponse.json({ error: error.message || "Authentication failed" }, { status: 500 });
  }
}
