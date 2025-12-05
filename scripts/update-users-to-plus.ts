// scripts/update-users-to-plus.ts
// One-time script to update all existing users to PLUS plan during testing

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Updating all users to PLUS plan for testing...\n");

  // Get count of users before update
  const totalUsers = await prisma.user.count();
  console.log(`📊 Total users in database: ${totalUsers}`);

  // Count users by plan before update
  const planCounts = await prisma.user.groupBy({
    by: ["plan"],
    _count: { plan: true },
  });
  console.log("\n📋 Current plan distribution:");
  planCounts.forEach((p) => {
    console.log(`   ${p.plan}: ${p._count.plan} users`);
  });

  // Update all users to PLUS plan
  const result = await prisma.user.updateMany({
    data: {
      plan: "PLUS",
    },
  });

  console.log(`\n✅ Successfully updated ${result.count} users to PLUS plan!`);

  // Verify the update
  const newPlanCounts = await prisma.user.groupBy({
    by: ["plan"],
    _count: { plan: true },
  });
  console.log("\n📋 New plan distribution:");
  newPlanCounts.forEach((p) => {
    console.log(`   ${p.plan}: ${p._count.plan} users`);
  });

  console.log("\n🎉 All users now have PLUS membership during testing phase!");
}

main()
  .catch((e) => {
    console.error("❌ Error updating users:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
