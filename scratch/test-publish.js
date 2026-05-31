const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({
    where: {
      status: { in: ["APPROVED", "SCHEDULED", "PUBLISHED"] }, // let's check already published ones too for debugging
    },
    include: {
      socialAccount: true,
    },
  });

  console.log(`Found ${posts.length} posts to inspect.`);
  for (const post of posts) {
    const platform = post.socialAccount.platform.toLowerCase();
    console.log(`\n--- Inspecting Post ${post.id} ---`);
    console.log(`Content: ${post.content}`);
    console.log(`Platform: ${platform}`);
    console.log(`Status: ${post.status}`);
    console.log(`Media URLs:`, post.mediaUrls);
    console.log(`platformSettings:`, post.platformSettings);

    if (platform === "youtube") {
      console.log(`[YouTube Platform matched!]`);
      console.log(`Access Token present:`, !!post.socialAccount.accessToken);
      console.log(`Refresh Token present:`, !!post.socialAccount.refreshToken);
    } else {
      console.log(`[Else Block matched! Platform is not youtube]`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
