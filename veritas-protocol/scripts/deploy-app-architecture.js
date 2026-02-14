const hre = require("hardhat");

/**
 * Deploy Veritas App Contract Architecture
 * 
 * This creates a flexible ecosystem:
 * 1. VeritasValidator - Generic validator supporting multiple apps
 * 2. VeritasApp - Orchestrates verification with configurable rules
 */

async function main() {
  console.log("🚀 Deploying Veritas App Architecture...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}\n`);

  // Base Sepolia addresses
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";

  // Step 1: Deploy VeritasValidator
  console.log("📋 Step 1: Deploying VeritasValidator...");
  const Validator = await hre.ethers.getContractFactory("VeritasValidator");
  const validator = await Validator.deploy(
    PRIMUS_TASK,
    REPUTATION_REGISTRY
  );
  await validator.deployed();
  console.log(`✅ VeritasValidator: ${validator.address}`);

  // Step 2: Deploy VeritasApp
  console.log("\n📋 Step 2: Deploying VeritasApp...");
  const App = await hre.ethers.getContractFactory("VeritasApp");
  const app = await App.deploy(
    PRIMUS_TASK,
    validator.address,
    REPUTATION_REGISTRY
  );
  await app.deployed();
  console.log(`✅ VeritasApp: ${app.address}`);

  // Step 3: Authorize app in validator
  console.log("\n📋 Step 3: Authorizing app in validator...");
  const authTx = await validator.setAppAuthorization(app.address, true);
  await authTx.wait();
  console.log(`✅ App authorized`);

  // Step 4: Add example rules
  console.log("\n📋 Step 4: Adding example verification rules...");
  
  // Rule 1: BTC Price
  const rule1Tx = await app.addRule(
    "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
    "data.rates.USD",
    hre.ethers.constants.HashZero, // Any data
    100,  // Score
    0,    // Decimals (integer)
    3600, // Max age: 1 hour
    "BTC/USD Price Verification"
  );
  await rule1Tx.wait();
  console.log(`✅ Rule 0: BTC Price (score: 100, max age: 1 hour)`);

  // Rule 2: ETH Price
  const rule2Tx = await app.addRule(
    "https://api.coinbase.com/v2/exchange-rates?currency=ETH",
    "data.rates.USD",
    hre.ethers.constants.HashZero,
    95,
    0,
    7200, // 2 hours
    "ETH/USD Price Verification"
  );
  await rule2Tx.wait();
  console.log(`✅ Rule 1: ETH Price (score: 95, max age: 2 hours)`);

  // Verify configuration
  console.log("\n📊 Verifying Configuration:");
  const rule0 = await app.getRule(0);
  console.log(`  Rule 0: ${rule0.description}`);
  console.log(`    URL: ${rule0.url}`);
  console.log(`    Score: ${rule0.reputationScore}`);
  console.log(`    Max Age: ${rule0.maxAgeSeconds} seconds`);

  const rule1 = await app.getRule(1);
  console.log(`  Rule 1: ${rule1.description}`);
  console.log(`    URL: ${rule1.url}`);
  console.log(`    Score: ${rule1.reputationScore}`);
  console.log(`    Max Age: ${rule1.maxAgeSeconds} seconds`);

  console.log("\n✅ Deployment Complete!");
  console.log("\n📝 Contract Addresses:");
  console.log(`  VeritasValidator: ${validator.address}`);
  console.log(`  VeritasApp: ${app.address}`);
  
  console.log("\n🔗 Basescan Links:");
  console.log(`  Validator: https://sepolia.basescan.org/address/${validator.address}`);
  console.log(`  App: https://sepolia.basescan.org/address/${app.address}`);

  console.log("\n💡 Next Steps:");
  console.log("  1. Users can call: app.requestVerification(ruleId, agentId)");
  console.log("  2. Run zkTLS off-chain with attestor");
  console.log("  3. Call: app.completeVerification(taskId)");
  console.log("  4. Reputation automatically granted!");
}

main().catch(console.error);
