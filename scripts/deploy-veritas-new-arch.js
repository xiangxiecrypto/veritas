const hre = require("hardhat");

/**
 * Deploy NEW Veritas Architecture: ValidationRegistry + PrimusVeritasApp
 */

async function main() {
  console.log("=".repeat(80));
  console.log("🚀 DEPLOYING NEW VERITAS ARCHITECTURE TO BASE SEPOLIA");
  console.log("=".repeat(80) + "\n");

  const signers = await hre.ethers.getSigners();
  
  if (signers.length === 0) {
    console.log("❌ ERROR: No signers found. Set PRIVATE_KEY in .env file");
    process.exit(1);
  }

  const deployer = signers[0];
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${hre.ethers.utils.formatEther(await deployer.getBalance())} ETH\n`);

  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";

  console.log(`📋 Network: Base Sepolia (Chain ID: 84532)`);
  console.log(`   Primus TaskContract: ${PRIMUS_TASK}`);
  console.log(`   Reputation Registry: ${REPUTATION_REGISTRY}\n`);

  // STEP 1: Deploy VeritasValidationRegistry
  console.log("📋 STEP 1: Deploying VeritasValidationRegistry...");
  console.log("-".repeat(80));

  const Registry = await hre.ethers.getContractFactory("VeritasValidationRegistry");
  const registry = await Registry.deploy();
  await registry.deployed();

  console.log(`✅ VeritasValidationRegistry deployed!`);
  console.log(`   Address: ${registry.address}`);
  console.log(`   Tx: ${registry.deployTransaction.hash}\n`);

  // STEP 2: Deploy PrimusVeritasApp
  console.log("📋 STEP 2: Deploying PrimusVeritasApp...");
  console.log("-".repeat(80));

  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = await App.deploy(PRIMUS_TASK, registry.address, REPUTATION_REGISTRY);
  await app.deployed();

  console.log(`✅ PrimusVeritasApp deployed!`);
  console.log(`   Address: ${app.address}`);
  console.log(`   Tx: ${app.deployTransaction.hash}\n`);

  // STEP 3: Add Rules
  console.log("📋 STEP 3: Adding Verification Rules...");
  console.log("-".repeat(80));

  const rules = [
    {
      url: "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
      dataKey: "data.rates.USD",
      score: 100,
      decimals: 0,
      maxAge: 3600,
      description: "BTC/USD Price"
    },
    {
      url: "https://api.coinbase.com/v2/exchange-rates?currency=ETH",
      dataKey: "data.rates.USD",
      score: 95,
      decimals: 0,
      maxAge: 7200,
      description: "ETH/USD Price"
    }
  ];

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    console.log(`\n   Adding Rule ${i}: ${rule.description}`);

    const addTx = await app.addRule(
      rule.url,
      rule.dataKey,
      rule.score,
      rule.decimals,
      rule.maxAge,
      rule.description
    );
    await addTx.wait();

    console.log(`   ✅ Tx: ${addTx.hash}`);
  }

  const totalRules = await app.ruleCount();
  console.log(`\n✅ Total rules: ${totalRules}\n`);

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("✅ DEPLOYMENT COMPLETE");
  console.log("=".repeat(80) + "\n");

  console.log(`📝 Contract Addresses:\n`);
  console.log(`   VeritasValidationRegistry: ${registry.address}`);
  console.log(`   https://sepolia.basescan.org/address/${registry.address}\n`);
  console.log(`   PrimusVeritasApp: ${app.address}`);
  console.log(`   https://sepolia.basescan.org/address/${app.address}\n`);

  console.log(`📊 Configuration:\n`);
  console.log(`   Network: Base Sepolia`);
  console.log(`   Rules: ${totalRules}`);
  console.log(`   Primus: ${PRIMUS_TASK}\n`);

  return {
    registry: registry.address,
    app: app.address
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
