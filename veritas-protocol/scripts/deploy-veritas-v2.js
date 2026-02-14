const hre = require("hardhat");

/**
 * Deploy VeritasValidationRegistry with new scoring system
 *
 * Features:
 * - Freshness-based scoring (100/98/95)
 * - Configurable base score
 * - Owner-controlled configuration
 */

async function main() {
  console.log("🚀 Deploying VeritasValidationRegistry (Enhanced Scoring)...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // Contract addresses (Base Sepolia)
  const identityRegistry = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  const reputationRegistry = "0x8004B663056A597Dffe9eCcC1965A193B7388713";
  const primusTaskContract = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";

  console.log("\n📋 Configuration:");
  console.log(`  IdentityRegistry: ${identityRegistry}`);
  console.log(`  ReputationRegistry: ${reputationRegistry}`);
  console.log(`  PrimusTaskContract: ${primusTaskContract}`);

  // Deploy
  console.log("\n⏳ Deploying...");
  const Veritas = await hre.ethers.getContractFactory("VeritasValidationRegistry");
  const contract = await Veritas.deploy(
    identityRegistry,
    reputationRegistry,
    primusTaskContract
  );

  await contract.deployed();

  console.log(`\n✅ Deployed!`);
  console.log(`Address: ${contract.address}`);
  console.log(`Tx: ${contract.deployTransaction.hash}`);
  console.log(`\n🔗 https://sepolia.basescan.org/address/${contract.address}`);

  // Verify configuration
  console.log("\n📊 Verifying Configuration:");

  const baseScore = await contract.baseScore();
  const decimals = await contract.scoreDecimals();
  const freshness1 = await contract.freshnessBonus1();
  const freshness2 = await veritas.freshnessBonus2();
  const maxAge = await contract.MAX_AGE();
  const owner = await contract.owner();

  console.log(`  Owner: ${owner}`);
  console.log(`  Base Score: ${baseScore}`);
  console.log(`  Decimals: ${decimals}`);
  console.log(`  Freshness Bonus 1: ${freshness1 / 60} minutes`);
  console.log(`  Freshness Bonus 2: ${freshness2 / 60} minutes`);
  console.log(`  Max Age: ${maxAge / 3600} hours`);

  // Test score calculation
  console.log("\n🧮 Testing Score Calculation:");
  const ages = [5 * 60, 15 * 60, 45 * 60];
  for (const age of ages) {
    const score = await contract.calculateScore(age);
    console.log(`  ${age / 60} min old → Score: ${score}`);
  }

  console.log("\n✅ Deployment Complete!");
  console.log("\n📝 Next Steps:");
  console.log("  1. Verify on Basescan");
  console.log("  2. Test with real attestation");
  console.log("  3. Configure custom scoring (optional)");
  console.log("  4. Transfer ownership if needed");
}

main().catch(console.error);
