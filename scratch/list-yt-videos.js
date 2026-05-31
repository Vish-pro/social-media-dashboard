const { PrismaClient } = require("@prisma/client");
const { google } = require("googleapis");

const prisma = new PrismaClient();

async function main() {
  const account = await prisma.socialAccount.findFirst({
    where: { platform: "youtube" }
  });

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

  const channelRes = await youtube.channels.list({
    part: ["contentDetails"],
    mine: true
  });

  const uploadsPlaylistId = channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  
  const playlistItemsRes = await youtube.playlistItems.list({
    part: ["snippet"],
    playlistId: uploadsPlaylistId,
    maxResults: 50
  });

  const ytVideos = playlistItemsRes.data.items || [];
  console.log("ALL UPLOADED VIDEOS:");
  for (const v of ytVideos) {
    console.log(`Title: "${v.snippet.title}" -> ID: ${v.snippet.resourceId?.videoId}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
