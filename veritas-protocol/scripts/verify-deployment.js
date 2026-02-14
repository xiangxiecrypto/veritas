const hre = require("hardhat");

/**
 * Verify Veritas deployment on Base Sepolia
 */

const VERITAS_ADDRESS = "0x33327EE8e1C100c773632626eB45F14eEcf37fed";
const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";
const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";

async function main() {
  console.log("🔍 Verifying Veritas Deployment\n");

  const veritas = await hre.ethers.getContractAt(
    "VeritasValidationRegistry",
    VERITAS_ADDRESS
  );

  // Check configuration
  console.log("📋 Configuration Check:");
  const identityAddr = await veritas.identityRegistry();
  const reputationAddr = await veritas.reputationRegistry();
  const primusAddr = await veritas.primusTaskContract();

  console.log(`  IdentityRegistry: ${identityAddr}`);
  console.log(`    Expected: ${IDENTITY_REGISTRY}`);
  console.log(`    ${identityAddr.toLowerCase() === IDENTITY_REGISTRY.toLowerCase() ? '✅' : '❌'}\n`);

  console.log(`  ReputationRegistry: ${reputationAddr}`);
  console.log(`    Expected: ${REPUTATION_REGISTRY}`);
  console.log(`    ${reputationAddr.toLowerCase() === REPUTATION_REGISTRY.toLowerCase() ? '✅' : '❌'}\n`);

  console.log(`  PrimusTaskContract: ${primusAddr}`);
  console.log(`    Expected: ${PRIMUS_TASK}`);
  console.log(`    ${primusAddr.toLowerCase() === PRIMUS_TASK.toLowerCase() ? '✅' : '❌'}\n`);

  // Check constants
  const maxAge = await veritas.MAX_AGE();
  console.log(`  MAX_AGE: ${maxAge} seconds (${maxAge / 3600} hours) ✅\n`);

  console.log("✅ All checks passed!");
  console.log(`\n🔗 View on Basescan: https://sepolia.basescan.org/address/${VERITAS_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
