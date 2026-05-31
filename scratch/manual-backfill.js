const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Update "vavvy shop" -> "SIa26BUljr0"
  await prisma.post.update({
    where: { id: "cmpsn4rhv000iq04kx9myar3v" },
    data: {
      platformSettings: {
        videoId: "SIa26BUljr0",
        url: "https://www.youtube.com/watch?v=SIa26BUljr0"
      }
    }
  });
  console.log("Updated post 'vavvy shop' successfully.");

  // Update "Shop now - at Vavvy.shop" -> "ysBzyArhkx0"
  await prisma.post.update({
    where: { id: "cmpsnhiuw000sq04ksavx2lyt" },
    data: {
      platformSettings: {
        videoId: "ysBzyArhkx0",
        url: "https://www.youtube.com/watch?v=ysBzyArhkx0"
      }
    }
  });
  console.log("Updated post 'Shop now - at Vavvy.shop' successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
