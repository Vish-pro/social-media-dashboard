import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({
    include: { socialAccount: true }
  });
  console.log("All DB Posts:", JSON.stringify(posts, null, 2));
}

main().catch(console.error);
