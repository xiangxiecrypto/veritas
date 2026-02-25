const { ethers } = require("hardhat");
const config = require("../deployed-config.json");

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("\n========================================");
  console.log("  Create Rules");
  console.log("  ========================================");
  console.log("");
  
  const RuleRegistry = await ethers.getContractFactory("RuleRegistry");
  const ruleRegistry = RuleRegistry.attach(config.contracts.RuleRegistry);
  
  const HTTPCheck = config.contracts.HTTPCheck;
  const JSONPathCheck = config.contracts.JSONPathCheck;
  
  // Check existing rules
  const nextId = await ruleRegistry.nextRuleId();
  console.log("Current rule count:", parseInt(nextId.toString()) - 1);
  
  if (parseInt(nextId.toString()) > 1) {
    console.log("Rules already exist, skipping creation");
    return;
  }
  
  // Rule 1: Binance BTC
  console.log("\nCreating Rule 1: Binance BTC Price");
  const checkParams1 = ethers.AbiCoder.defaultAbiCoder().encode(
    ['tuple(string,bytes,bool,bool)'],
    [['GET', '0x7072696365', true, true]]
  );
  
  const tx1 = await ruleRegistry.createRule(
    'Binance BTC Price',
    'Verify BTC price from Binance API',
    HTTPCheck,
    'https://api.binance.com/*',
    'price',
    '$.price',
    checkParams1,
    3600
  );
  await tx1.wait();
  console.log("[OK] Rule 1 created");
  
  // Rule 2: Binance ETH
  console.log("\nCreating Rule 2: Binance ETH Price");
  const tx2 = await ruleRegistry.createRule(
    'Binance ETH Price',
    'Verify ETH price from Binance API',
    HTTPCheck,
    'https://api.binance.com/*',
    'price',
    '$.price',
    checkParams1,
    1800
  );
  await tx2.wait();
  console.log("[OK] Rule 2 created");
  
  console.log("\n========================================");
  console.log("[OK] All rules created!");
  console.log("========================================");
}

main().catch(console.error);
