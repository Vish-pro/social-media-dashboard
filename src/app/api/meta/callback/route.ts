import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("meta_oauth_state")?.value;
  const workspaceId = cookieStore.get("meta_oauth_workspace")?.value;
  const scopeType = cookieStore.get("meta_oauth_scope_type")?.value || "facebook";

  if (!workspaceId) {
    return NextResponse.json({ error: "Missing workspace context" }, { status: 400 });
  }

  // Developer Mock Fallback: If code is missing or placeholder credentials are active, auto-create developer mock channel!
  const isMockApp = 
    !code || 
    process.env.META_APP_ID === "PLACEHOLDER_META_APP_ID" || 
    !process.env.META_APP_ID;

  if (isMockApp) {
    const mockAccounts: Record<string, { name: string; handle: string }> = {
      facebook: { name: "Vavvy Shop Facebook Page", handle: "vavvyshop_page" },
      instagram: { name: "Vavvy Shop Instagram Business", handle: "vavvyshop_ig" },
      threads: { name: "Vavvy Shop Threads Profile", handle: "vavvyshop_threads" },
    };

    const mock = mockAccounts[scopeType] || mockAccounts.facebook;

    // Save mock channels into database SocialAccount
    await prisma.socialAccount.upsert({
      where: {
        platform_accountId: {
          platform: scopeType,
          accountId: `mock_${scopeType}_id`,
        }
      },
      update: {
        workspaceId,
        accessToken: `mock_long_lived_token_${scopeType}`,
        accountName: mock.name,
      },
      create: {
        workspaceId,
        platform: scopeType,
        accountId: `mock_${scopeType}_id`,
        accessToken: `mock_long_lived_token_${scopeType}`,
        accountName: mock.name,
      }
    });

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/connections`);
  }

  // Live Meta Graph API Token Exchange
  try {
    const metaAppId = process.env.META_APP_ID;
    const metaAppSecret = process.env.META_APP_SECRET;
    const nextAuthUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const redirectUri = `${nextAuthUrl}/api/meta/callback`;

    // 1. Exchange authorization code for User Access Token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token?` +
      `client_id=${metaAppId}&` +
      `redirect_uri=${redirectUri}&` +
      `client_secret=${metaAppSecret}&` +
      `code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(tokenData.error.message || "Failed to exchange authorization code.");
    }

    const shortToken = tokenData.access_token;

    // 2. Exchange for a Long-Lived User Access Token (60 days)
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${metaAppId}&` +
      `client_secret=${metaAppSecret}&` +
      `fb_exchange_token=${shortToken}`
    );
    const longTokenData = await longTokenRes.json();
    const longUserToken = longTokenData.access_token;

    // 3. Fetch connected pages or accounts based on scopeType
    if (scopeType === "facebook") {
      // Fetch Page accounts (exchanging for Never-Expiring Page Tokens)
      const pagesRes = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${longUserToken}`);
      const pagesData = await pagesRes.json();

      if (pagesData.data && pagesData.data.length > 0) {
        for (const page of pagesData.data) {
          await prisma.socialAccount.upsert({
            where: {
              platform_accountId: {
                platform: "facebook",
                accountId: page.id,
              }
            },
            update: {
              workspaceId,
              accessToken: page.access_token, // Page Access Token (Never Expires!)
              accountName: page.name,
            },
            create: {
              workspaceId,
              platform: "facebook",
              accountId: page.id,
              accessToken: page.access_token,
              accountName: page.name,
            }
          });
        }
      }
    } else if (scopeType === "instagram") {
      // Fetch Pages and retrieve their connected Instagram Business accounts
      const pagesRes = await fetch(
        `https://graph.facebook.com/v20.0/me/accounts?fields=name,instagram_business_account&access_token=${longUserToken}`
      );
      const pagesData = await pagesRes.json();

      if (pagesData.data && pagesData.data.length > 0) {
        for (const page of pagesData.data) {
          const igAccount = page.instagram_business_account;
          if (igAccount) {
            // Fetch Instagram account username/info
            const igRes = await fetch(
              `https://graph.facebook.com/v20.0/${igAccount.id}?fields=username,name&access_token=${longUserToken}`
            );
            const igData = await igRes.json();

            await prisma.socialAccount.upsert({
              where: {
                platform_accountId: {
                  platform: "instagram",
                  accountId: igAccount.id,
                }
              },
              update: {
                workspaceId,
                accessToken: longUserToken, // Instagram uses User Access Token
                accountName: igData.name || page.name,
              },
              create: {
                workspaceId,
                platform: "instagram",
                accountId: igAccount.id,
                accessToken: longUserToken,
                accountName: igData.name || page.name,
              }
            });
          }
        }
      }
    } else if (scopeType === "threads") {
      // Fetch Threads user info
      const threadsRes = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username,name&access_token=${longUserToken}`);
      const threadsData = await threadsRes.json();

      if (threadsData.id) {
        await prisma.socialAccount.upsert({
          where: {
            platform_accountId: {
              platform: "threads",
              accountId: threadsData.id,
            }
          },
          update: {
            workspaceId,
            accessToken: longUserToken,
            accountName: threadsData.name || "Threads User",
          },
          create: {
            workspaceId,
            platform: "threads",
            accountId: threadsData.id,
            accessToken: longUserToken,
            accountName: threadsData.name || "Threads User",
          }
        });
      }
    }

    return NextResponse.redirect(`${nextAuthUrl}/connections`);
  } catch (error) {
    console.error("Meta OAuth Callback Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Meta callback integration error" }, { status: 500 });
  }
}
