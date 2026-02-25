const { ethers } = require("hardhat");
const config = require("../deployed-config.json");

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("\n========================================");
  console.log("  创建规则");
  console.log("  ========================================");
  console.log("");
  
  const RuleRegistry = await ethers.getContractFactory("RuleRegistry");
  const ruleRegistry = RuleRegistry.attach(config.contracts.RuleRegistry);
  
  const HTTPCheck = config.contracts.HTTPCheck;
  const JSONPathCheck = config.contracts.JSONPathCheck;
  
  // 检查现有规则
  const nextId = await ruleRegistry.nextRuleId();
  console.log("当前规则数:", parseInt(nextId.toString()) - 1);
  
  if (parseInt(nextId.toString()) > 1) {
    console.log("规则已存在，跳过创建");
    return;
  }
  
  // 规则 1: Binance BTC
  console.log("\n创建规则 1: Binance BTC Price");
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
  console.log("✅ 规则 1 创建完成");
  
  // 规则 2: Binance ETH
  console.log("\n创建规则 2: Binance ETH Price");
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
  console.log("✅ 规则 2 创建完成");
  
  console.log("\n========================================");
  console.log("✅ 所有规则创建完成！");
  console.log("========================================");
}

main().catch(console.error);
