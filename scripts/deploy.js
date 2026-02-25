const { ethers } = require("hardhat");

async function main() {
  const PRIMUS_ZKTLS = '0xCE7cefB3B5A7eB44B59F60327A53c9Ce53B0afdE';
  
  const [deployer] = await ethers.getSigners();
  console.log("\n========================================");
  console.log("  Deploy Veritas Protocol");
  console.log("  ========================================");
  console.log("  Deployer:", deployer.address);
  console.log("");
  
  // 1. RuleRegistry
  console.log("1. RuleRegistry...");
  const RuleRegistry = await ethers.getContractFactory("RuleRegistry");
  const ruleRegistry = await RuleRegistry.deploy();
  await ruleRegistry.waitForDeployment();
  const rrAddr = await ruleRegistry.getAddress();
  console.log("   Address:", rrAddr);
  
  // 2. HTTPCheck
  console.log("2. HTTPCheck...");
  const HTTPCheck = await ethers.getContractFactory("HTTPCheck");
  const httpCheck = await HTTPCheck.deploy();
  await httpCheck.waitForDeployment();
  const hcAddr = await httpCheck.getAddress();
  console.log("   Address:", hcAddr);
  
  // 3. JSONPathCheck
  console.log("3. JSONPathCheck...");
  const JSONPathCheck = await ethers.getContractFactory("JSONPathCheck");
  const jsonPathCheck = await JSONPathCheck.deploy();
  await jsonPathCheck.waitForDeployment();
  const jpcAddr = await jsonPathCheck.getAddress();
  console.log("   Address:", jpcAddr);
  
  // 4. VeritasValidator
  console.log("4. VeritasValidator...");
  const VeritasValidator = await ethers.getContractFactory("VeritasValidator");
  const validator = await VeritasValidator.deploy(rrAddr, PRIMUS_ZKTLS);
  await validator.waitForDeployment();
  const vAddr = await validator.getAddress();
  console.log("   Address:", vAddr);
  console.log("");
  
  // 5. Create sample rules
  console.log("5. Create sample rules...");
  
  // Rule 1: Binance BTC
  const checkParams = ethers.AbiCoder.defaultAbiCoder().encode(
    ['tuple(string,bytes,bool,bool)'],
    [['GET', '0x7072696365', true, true]]
  );
  
  await (await ruleRegistry.createRule(
    'Binance BTC Price',
    'Verify BTC price from Binance',
    hcAddr,
    'https://api.binance.com/*',
    'price',
    '$.price',
    checkParams,
    3600
  )).wait();
  console.log("   [OK] Rule 1: Binance BTC Price");
  
  // Rule 2: Binance ETH
  await (await ruleRegistry.createRule(
    'Binance ETH Price',
    'Verify ETH price from Binance',
    hcAddr,
    'https://api.binance.com/*',
    'price',
    '$.price',
    checkParams,
    1800
  )).wait();
  console.log("   [OK] Rule 2: Binance ETH Price");
  
  console.log("");
  console.log("========================================");
  console.log("[OK] Deployment complete!");
  console.log("========================================");
  console.log("");
  console.log("Contract addresses:");
  console.log("  RuleRegistry:   ", rrAddr);
  console.log("  HTTPCheck:      ", hcAddr);
  console.log("  JSONPathCheck:  ", jpcAddr);
  console.log("  VeritasValidator:", vAddr);
  console.log("");
  
  // Save config
  const fs = require('fs');
  const config = {
    network: 'baseSepolia',
    deployer: deployer.address,
    contracts: {
      RuleRegistry: rrAddr,
      HTTPCheck: hcAddr,
      JSONPathCheck: jpcAddr,
      VeritasValidator: vAddr,
      PrimusZKTLS: PRIMUS_ZKTLS,
    },
    rules: {
      BinanceBTC: 1,
      BinanceETH: 2,
    }
  };
  fs.writeFileSync('deployed-config.json', JSON.stringify(config, null, 2));
  console.log("Config saved to: deployed-config.json");
}

main().catch(console.error);
