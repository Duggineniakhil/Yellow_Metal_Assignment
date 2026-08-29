import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding loan schemes...");

  // Upsert ensures idempotent seeding — safe to run multiple times
  const bulletPlan = await prisma.loanScheme.upsert({
    where: { id: "PLAN_BULLET_01" },
    update: {},
    create: {
      id: "PLAN_BULLET_01",
      name: "Bullet Repayment Plan",
      description:
        "Pay only monthly interest during the loan tenure. The principal is repaid in full at maturity. Ideal for short-term gold loans with lower periodic outflow.",
      baseInterestRate: 9.5, // 9.5% per annum
      maxLtvPercent: 75.0, // Maximum 75% LTV as per RBI guidelines
    },
  });

  const emiPlan = await prisma.loanScheme.upsert({
    where: { id: "PLAN_EMI_01" },
    update: {},
    create: {
      id: "PLAN_EMI_01",
      name: "Monthly EMI Plan",
      description:
        "Repay in fixed monthly installments (EMI) covering both principal and interest. Suitable for borrowers who prefer a structured repayment schedule.",
      baseInterestRate: 11.0, // 11% per annum
      maxLtvPercent: 65.0, // Conservative 65% LTV
    },
  });

  console.log("✅ Seeded loan schemes:");
  console.log(`   - ${bulletPlan.name} (${bulletPlan.id}): ${bulletPlan.baseInterestRate}% interest, ${bulletPlan.maxLtvPercent}% LTV`);
  console.log(`   - ${emiPlan.name} (${emiPlan.id}): ${emiPlan.baseInterestRate}% interest, ${emiPlan.maxLtvPercent}% LTV`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
