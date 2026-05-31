const { PrismaClient } = require("@prisma/client");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  // Get the YouTube social account
  const account = await prisma.socialAccount.findFirst({
    where: { platform: "youtube" }
  });

  if (!account) {
    console.error("No YouTube account found in DB!");
    return;
  }

  console.log(`Using YouTube account: ${account.accountName} (${account.accountId})`);

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

  // Let's list the channels to verify the connection is active
  try {
    const channelRes = await youtube.channels.list({
      part: ["snippet", "contentDetails", "statistics"],
      mine: true,
    });
    console.log("Channel list response successful!");
    console.log("Channels:", JSON.stringify(channelRes.data.items, null, 2));
  } catch (err) {
    console.error("Failed to list channels:", err.message);
    return;
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
