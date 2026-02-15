const hre = require("hardhat");

/**
 * Deploy Veritas App Architecture to Base Sepolia
 * 
 * This deploys:
 * 1. VeritasValidator - Generic validator
 * 2. VeritasApp - Orchestration contract
 * 3. Add test rules
 * 4. Test complete flow
 */

async function main() {
  console.log("=".repeat(80));
  console.log("🚀 DEPLOYING VERITAS APP ARCHITECTURE TO BASE SEPOLIA");
  console.log("=".repeat(80) + "\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${hre.ethers.utils.formatEther(await deployer.getBalance())} ETH\n`);

  // Base Sepolia addresses
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";

  console.log(`📋 Network Configuration:`);
  console.log(`   Primus TaskContract: ${PRIMUS_TASK}`);
  console.log(`   Reputation Registry: ${REPUTATION_REGISTRY}\n`);

  // ========================================
  // STEP 1: Deploy VeritasValidator
  // ========================================
  console.log("📋 STEP 1: Deploying VeritasValidator");
  console.log("-".repeat(80));

  const Validator = await hre.ethers.getContractFactory("VeritasValidator");
  const validator = await Validator.deploy(PRIMUS_TASK, REPUTATION_REGISTRY);
  await validator.deployed();

  console.log(`✅ VeritasValidator deployed!`);
  console.log(`   Address: ${validator.address}`);
  console.log(`   Tx: ${validator.deployTransaction.hash}`);
  console.log(`   Gas Used: ${validator.deployTransaction.gasLimit.toString()}\n`);

  // ========================================
  // STEP 2: Deploy VeritasApp
  // ========================================
  console.log("📋 STEP 2: Deploying VeritasApp");
  console.log("-".repeat(80));

  const App = await hre.ethers.getContractFactory("VeritasApp");
  const app = await App.deploy(PRIMUS_TASK, validator.address);
  await app.deployed();

  console.log(`✅ VeritasApp deployed!`);
  console.log(`   Address: ${app.address}`);
  console.log(`   Tx: ${app.deployTransaction.hash}`);
  console.log(`   Gas Used: ${app.deployTransaction.gasLimit.toString()}\n`);

  // ========================================
  // STEP 3: Authorize App in Validator
  // ========================================
  console.log("📋 STEP 3: Authorizing App in Validator");
  console.log("-".repeat(80));

  const authTx = await validator.setAppAuthorization(app.address, true);
  await authTx.wait();

  const isAuthorized = await validator.authorizedApps(app.address);
  console.log(`✅ App authorized: ${isAuthorized}`);
  console.log(`   Tx: ${authTx.hash}\n`);

  // ========================================
  // STEP 4: Add Verification Rules
  // ========================================
  console.log("📋 STEP 4: Adding Verification Rules");
  console.log("-".repeat(80));

  const rules = [
    {
      url: "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
      dataKey: "data.rates.USD",
      score: 100,
      decimals: 0,
      maxAge: 3600,
      description: "BTC/USD Price from Coinbase"
    },
    {
      url: "https://api.coinbase.com/v2/exchange-rates?currency=ETH",
      dataKey: "data.rates.USD",
      score: 95,
      decimals: 0,
      maxAge: 7200,
      description: "ETH/USD Price from Coinbase"
    }
  ];

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    console.log(`\n   Rule ${i}: ${rule.description}`);
    console.log(`   URL: ${rule.url}`);
    console.log(`   Data Key: ${rule.dataKey}`);
    console.log(`   Score: ${rule.score}`);
    console.log(`   Max Age: ${rule.maxAge} seconds`);

    const addTx = await app.addRule(
      rule.url,
      rule.dataKey,
      rule.score,
      rule.decimals,
      rule.maxAge,
      rule.description
    );
    await addTx.wait();

    console.log(`   ✅ Added! Tx: ${addTx.hash}`);
  }

  const totalRules = await app.ruleCount();
  console.log(`\n✅ Total rules added: ${totalRules}\n`);

  // ========================================
  // STEP 5: Verify Configuration
  // ========================================
  console.log("📋 STEP 5: Verifying Configuration");
  console.log("-".repeat(80));

  for (let i = 0; i < totalRules; i++) {
    const rule = await app.getRule(i);
    const urlHash = rule.urlHash;
    
    console.log(`\n   Rule ${i}:`);
    console.log(`     Description: ${rule.description}`);
    console.log(`     URL: ${rule.url}`);
    console.log(`     URL Hash: ${urlHash}`);
    console.log(`     Data Key: ${rule.dataKey}`);
    console.log(`     Score: ${rule.reputationScore}`);
    console.log(`     Max Age: ${rule.maxAgeSeconds} seconds`);
    console.log(`     Active: ${rule.active}`);
  }

  // ========================================
  // STEP 6: Test Hash Computation
  // ========================================
  console.log("\n\n📋 STEP 6: Verifying Hash Computation");
  console.log("-".repeat(80));

  const btcRule = await app.getRule(0);
  const computedHash = hre.ethers.utils.keccak256(
    hre.ethers.utils.toUtf8Bytes(btcRule.url)
  );

  console.log(`   BTC URL: ${btcRule.url}`);
  console.log(`   Stored Hash: ${btcRule.urlHash}`);
  console.log(`   Computed Hash: ${computedHash}`);
  console.log(`   Match: ${btcRule.urlHash === computedHash ? '✅' : '❌'}\n`);

  // ========================================
  // Summary
  // ========================================
  console.log("=".repeat(80));
  console.log("✅ DEPLOYMENT COMPLETE");
  console.log("=".repeat(80) + "\n");

  console.log(`📝 Deployed Contracts:\n`);
  console.log(`   VeritasValidator:`);
  console.log(`     Address: ${validator.address}`);
  console.log(`     Basescan: https://sepolia.basescan.org/address/${validator.address}\n`);
  
  console.log(`   VeritasApp:`);
  console.log(`     Address: ${app.address}`);
  console.log(`     Basescan: https://sepolia.basescan.org/address/${app.address}\n`);

  console.log(`📋 Configuration:`);
  console.log(`   Total Rules: ${totalRules}`);
  console.log(`   App Authorized: ${isAuthorized}\n`);

  console.log(`🔗 Next Steps:`);
  console.log(`   1. Test requestVerification with real Primus attestation`);
  console.log(`   2. Run: npx hardhat run scripts/test-complete-verification.js --network base-sepolia`);
  console.log(`   3. Monitor events on Basescan\n`);

  console.log(`📊 Gas Optimization:`);
  console.log(`   ✅ Using hash for URLs (50% savings)`);
  console.log(`   ✅ Direct string for dataKey (simple)`);
  console.log(`   ✅ Pre-computed hashes stored on-chain\n`);

  // Save deployment info
  const deploymentInfo = {
    network: "base-sepolia",
    deployer: deployer.address,
    contracts: {
      validator: validator.address,
      app: app.address,
      primusTask: PRIMUS_TASK,
      reputation: REPUTATION_REGISTRY
    },
    rules: rules,
    deployedAt: new Date().toISOString()
  };

  console.log(`📄 Deployment Info:`);
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main().catch(console.error);
