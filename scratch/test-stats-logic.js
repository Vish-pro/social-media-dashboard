const { PrismaClient } = require("@prisma/client");
const { google } = require("googleapis");

const prisma = new PrismaClient();

async function main() {
  const workspaceId = "cmpdd6xza0005xyzbla8pqiqd";
  
  const posts = await prisma.post.findMany({
    where: { workspaceId },
    include: { socialAccount: true },
    orderBy: { scheduledFor: "asc" },
  });

  const postsWithMetrics = posts.map(post => {
    return {
      ...post,
      metrics: null
    };
  });

  // Fetch real YouTube statistics for published videos
  const ytPosts = postsWithMetrics.filter(
    p => p.socialAccount?.platform.toLowerCase() === "youtube" && p.status === "PUBLISHED"
  );

  const videoIds = [];
  const postMapByVideoId = {};

  for (const post of ytPosts) {
    if (post.platformSettings) {
      try {
        const settings = typeof post.platformSettings === "string"
          ? JSON.parse(post.platformSettings)
          : post.platformSettings;
        if (settings.videoId) {
          videoIds.push(settings.videoId);
          postMapByVideoId[settings.videoId] = post;
        }
      } catch (err) {
        console.error("Parse error for post", post.id, err.message);
      }
    }
  }

  console.log("Extracted video IDs for queue:", videoIds);

  if (videoIds.length > 0) {
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
          id: videoIds,
          part: ["statistics"]
        });

        const videoItems = videoListRes.data.items || [];
        for (const item of videoItems) {
          const stats = item.statistics;
          const post = postMapByVideoId[item.id];
          if (post && stats) {
            post.metrics = {
              views: Number(stats.viewCount ?? 0),
              likes: Number(stats.likeCount ?? 0),
              comments: Number(stats.commentCount ?? 0),
            };
          }
        }
      } catch (err) {
        console.error("Error fetching real YouTube stats for posts:", err);
      }
    }
  }

  console.log("\nPOSTS DETAILS:");
  for (const p of postsWithMetrics) {
    console.log(`Content: "${p.content}"`);
    console.log(`Status: ${p.status}`);
    console.log(`platformSettings:`, p.platformSettings);
    console.log(`metrics:`, p.metrics);
    console.log("---");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
