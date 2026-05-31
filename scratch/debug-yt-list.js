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

  const videoIds = ["ysBzyArhkx0", "m_dqNTLqLY8", "SIa26BUljr0", "MivphGlHYso"];

  console.log("Querying YouTube API for video IDs:", videoIds);
  const res = await youtube.videos.list({
    id: videoIds, // wait, is it an array or a comma-separated string?
    part: ["statistics"]
  });

  console.log("YouTube API returned items count:", res.data.items?.length);
  for (const item of res.data.items || []) {
    console.log(`Video ID: ${item.id} -> Stats:`, item.statistics);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
