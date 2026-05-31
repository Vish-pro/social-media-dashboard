const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({
    where: {
      socialAccount: {
        platform: {
          equals: "youtube",
          mode: "insensitive"
        }
      }
    },
    include: { socialAccount: true }
  });
  console.log("YouTube Posts:", JSON.stringify(posts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
