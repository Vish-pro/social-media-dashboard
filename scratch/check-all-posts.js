const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({
    include: { socialAccount: true }
  });
  console.log("All Posts in DB:", JSON.stringify(posts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
