const { ethers } = require("hardhat");

async function main() {
  const PRIMUS_ZKTLS = '0xCE7cefB3B5A7eB44B59F60327A53c9Ce53B0afdE';
  
  const [deployer] = await ethers.getSigners();
  console.log("\n========================================");
  console.log("  部署 Veritas Protocol");
  console.log("  ========================================");
  console.log("  部署账户:", deployer.address);
  console.log("");
  
  // 1. RuleRegistry
  console.log("1. RuleRegistry...");
  const RuleRegistry = await ethers.getContractFactory("RuleRegistry");
  const ruleRegistry = await RuleRegistry.deploy();
  await ruleRegistry.waitForDeployment();
  const rrAddr = await ruleRegistry.getAddress();
  console.log("   地址:", rrAddr);
  
  // 2. HTTPCheck
  console.log("2. HTTPCheck...");
  const HTTPCheck = await ethers.getContractFactory("HTTPCheck");
  const httpCheck = await HTTPCheck.deploy();
  await httpCheck.waitForDeployment();
  const hcAddr = await httpCheck.getAddress();
  console.log("   地址:", hcAddr);
  
  // 3. JSONPathCheck
  console.log("3. JSONPathCheck...");
  const JSONPathCheck = await ethers.getContractFactory("JSONPathCheck");
  const jsonPathCheck = await JSONPathCheck.deploy();
  await jsonPathCheck.waitForDeployment();
  const jpcAddr = await jsonPathCheck.getAddress();
  console.log("   地址:", jpcAddr);
  
  // 4. VeritasValidator
  console.log("4. VeritasValidator...");
  const VeritasValidator = await ethers.getContractFactory("VeritasValidator");
  const validator = await VeritasValidator.deploy(rrAddr, PRIMUS_ZKTLS);
  await validator.waitForDeployment();
  const vAddr = await validator.getAddress();
  console.log("   地址:", vAddr);
  console.log("");
  
  // 5. 创建示例规则
  console.log("5. 创建示例规则...");
  
  // 规则 1: Binance BTC
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
  console.log("   ✅ 规则 1: Binance BTC Price");
  
  // 规则 2: Binance ETH
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
  console.log("   ✅ 规则 2: Binance ETH Price");
  
  console.log("");
  console.log("========================================");
  console.log("✅ 部署完成！");
  console.log("========================================");
  console.log("");
  console.log("合约地址:");
  console.log("  RuleRegistry:   ", rrAddr);
  console.log("  HTTPCheck:      ", hcAddr);
  console.log("  JSONPathCheck:  ", jpcAddr);
  console.log("  VeritasValidator:", vAddr);
  console.log("");
  
  // 保存配置
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
  console.log("配置已保存到: deployed-config.json");
}

main().catch(console.error);
