const { PrismaClient } = require("@prisma/client");
const { google } = require("googleapis");

const prisma = new PrismaClient();

async function main() {
  const account = await prisma.socialAccount.findFirst({
    where: { platform: "youtube" }
  });

  if (!account) {
    console.error("No connected YouTube account found.");
    return;
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

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  // 1. Fetch channel's uploaded videos list
  console.log("Fetching channel info...");
  const channelRes = await youtube.channels.list({
    part: ["contentDetails"],
    mine: true
  });

  const uploadsPlaylistId = channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    console.error("Failed to find uploads playlist.");
    return;
  }

  console.log(`Fetching uploaded videos from playlist: ${uploadsPlaylistId}`);
  const playlistItemsRes = await youtube.playlistItems.list({
    part: ["snippet"],
    playlistId: uploadsPlaylistId,
    maxResults: 50
  });

  const ytVideos = playlistItemsRes.data.items || [];
  console.log(`Found ${ytVideos.length} videos on YouTube.`);

  // 2. Fetch all YouTube posts from DB
  const dbPosts = await prisma.post.findMany({
    where: {
      socialAccount: {
        platform: "youtube"
      }
    }
  });

  console.log(`Found ${dbPosts.length} YouTube posts in DB.`);

  // 3. Match and backfill
  for (const post of dbPosts) {
    // If it already has platformSettings, skip it
    if (post.platformSettings) {
      try {
        const settings = typeof post.platformSettings === "string" 
          ? JSON.parse(post.platformSettings) 
          : post.platformSettings;
        if (settings.videoId) {
          console.log(`Post ${post.id} ("${post.content}") already has videoId: ${settings.videoId}. Skipping.`);
          continue;
        }
      } catch {}
    }

    // Attempt to match by content similarity with YouTube video titles
    const normalizedContent = (post.content || "").toLowerCase().trim();
    const match = ytVideos.find(v => {
      const title = (v.snippet?.title || "").toLowerCase().trim();
      return title.includes(normalizedContent) || normalizedContent.includes(title);
    });

    if (match) {
      const videoId = match.snippet?.resourceId?.videoId;
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      console.log(`\nMatch found!`);
      console.log(`Post Content: "${post.content}"`);
      console.log(`YouTube Title: "${match.snippet?.title}"`);
      console.log(`Assigned Video ID: ${videoId}`);

      await prisma.post.update({
        where: { id: post.id },
        data: {
          platformSettings: { videoId, url }
        }
      });
      console.log("Updated in database successfully.");
    } else {
      console.log(`No matching YouTube video found for DB post: "${post.content}"`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
