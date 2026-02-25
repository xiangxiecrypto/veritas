const { ethers } = require("hardhat");
const config = require("../deployed-config.json");

async function main() {
  const RuleRegistry = await ethers.getContractFactory("RuleRegistry");
  const ruleRegistry = RuleRegistry.attach(config.contracts.RuleRegistry);
  
  const nextId = await ruleRegistry.nextRuleId();
  console.log("nextRuleId:", nextId.toString());
  
  for (let i = 1; i < parseInt(nextId.toString()); i++) {
    const rule = await ruleRegistry.getRule(i);
    console.log(`\n规则 ${i}: ${rule.name}`);
    console.log("  URL:", rule.urlTemplate);
    console.log("  DataKey:", rule.expectedDataKey);
    console.log("  ParsePath:", rule.expectedParsePath);
    console.log("  Check:", rule.checkContract);
  }
}

main().catch(console.error);
