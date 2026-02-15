const hre = require("hardhat");

/**
 * Deploy Veritas: Build trust for AI agents with ERC-8004
 * 
 * Flow:
 * 1. Agent registers in IdentityRegistry (ERC-8004) → gets agentId
 * 2. Agent calls PrimusVeritasApp.requestVerification(agentId) → builds reputation
 * 
 * Only registered agents can build reputation.
 */

async function main() {
  console.log("=".repeat(80));
  console.log("🚀 DEPLOYING VERITAS - ERC-8004 AGENT TRUST");
  console.log("=".repeat(80) + "\n");

  const signers = await hre.ethers.getSigners();
  
  if (signers.length === 0) {
    console.log("❌ ERROR: No signers found. Set PRIVATE_KEY in .env file");
    process.exit(1);
  }

  const deployer = signers[0];
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${hre.ethers.utils.formatEther(await deployer.getBalance())} ETH\n`);

  // Contract addresses
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";
  const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

  console.log(`📋 Network: Base Sepolia (Chain ID: 84532)`);
  console.log(`   Primus TaskContract: ${PRIMUS_TASK}`);
  console.log(`   Reputation Registry: ${REPUTATION_REGISTRY}`);
  console.log(`   Identity Registry: ${IDENTITY_REGISTRY}\n`);

  // STEP 1: Deploy VeritasValidationRegistry
  console.log("📋 STEP 1: Deploying VeritasValidationRegistry...");
  console.log("-".repeat(80));

  const Registry = await hre.ethers.getContractFactory("VeritasValidationRegistry");
  const registry = await Registry.deploy();
  await registry.deployed();

  console.log(`✅ VeritasValidationRegistry deployed!`);
  console.log(`   Address: ${registry.address}`);
  console.log(`   Tx: ${registry.deployTransaction.hash}\n`);

  // STEP 2: Deploy PrimusVeritasApp (with IdentityRegistry)
  console.log("📋 STEP 2: Deploying PrimusVeritasApp...");
  console.log("-".repeat(80));

  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = await App.deploy(
    PRIMUS_TASK, 
    registry.address, 
    REPUTATION_REGISTRY,
    IDENTITY_REGISTRY  // ✅ NEW: IdentityRegistry for agent verification
  );
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

  // STEP 4: Verify IdentityRegistry integration
  console.log("📋 STEP 4: Verifying IdentityRegistry integration...");
  console.log("-".repeat(80));

  try {
    const identityRegAddr = await app.identityRegistry();
    console.log(`✅ IdentityRegistry set: ${identityRegAddr}`);
    
    // Test with a registered agent (agent 1)
    const iface = new hre.ethers.utils.Interface([
      'function ownerOf(uint256) view returns (address)'
    ]);
    const identityReg = new hre.ethers.Contract(IDENTITY_REGISTRY, iface, deployer);
    const owner1 = await identityReg.ownerOf(1);
    console.log(`✅ Agent 1 registered, owner: ${owner1}`);
  } catch (e) {
    console.log(`❌ Error: ${e.message}`);
  }

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
  console.log(`   Primus: ${PRIMUS_TASK}`);
  console.log(`   IdentityRegistry: ${IDENTITY_REGISTRY}\n`);
  
  console.log(`🔐 Agent Verification:\n`);
  console.log(`   Only registered agents (ERC-8004) can build reputation`);
  console.log(`   Check: identityRegistry.ownerOf(agentId) must not revert\n`);

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
