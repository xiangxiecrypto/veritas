const { ethers } = require("hardhat");
const config = require("../deployed-config.json");

async function main() {
  const [signer] = await ethers.getSigners();
  const RuleRegistry = await ethers.getContractFactory("RuleRegistry");
  const ruleRegistry = RuleRegistry.attach(config.contracts.RuleRegistry);
  
  const nextId = await ruleRegistry.nextRuleId();
  console.log('nextRuleId:', nextId.toString());
  
  // Create rule 5 if not exists
  if (parseInt(nextId.toString()) <= 5) {
    console.log('\nCreating Rule 5...');
    
    const JSON_PATH_CHECK = config.contracts.JSONPathCheck;
    const jsonCheckParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ['tuple(string,string,string,uint256,bool)'],
      [['GET', '{"price"', '}', 10, true]]
    );
    
    try {
      const tx = await ruleRegistry.createRule(
        'Advanced JSON Check',
        'Using JSONPathCheck for complex validation',
        JSON_PATH_CHECK,
        'https://api.binance.com/*',
        'price',
        '$.data.price',
        jsonCheckParams,
        3600
      );
      await tx.wait();
      console.log('[OK] Rule 5 created');
    } catch (e) {
      console.log('Error:', e.message);
    }
  }
  
  // Display all rules
  console.log('\n========================================');
  console.log('All Rules and Check Contracts:');
  console.log('========================================');
  
  const updatedNextId = await ruleRegistry.nextRuleId();
  for (let i = 1; i < parseInt(updatedNextId.toString()); i++) {
    const rule = await ruleRegistry.getRule(i);
    console.log(`\nRule ${i}: ${rule.name}`);
    console.log('  Check Contract:', rule.checkContract);
    console.log('  URL:', rule.urlTemplate);
    
    // Mark which check contract is used
    if (rule.checkContract.toLowerCase() === config.contracts.HTTPCheck.toLowerCase()) {
      console.log('  -> Uses: HTTPCheck');
    } else if (rule.checkContract.toLowerCase() === config.contracts.JSONPathCheck.toLowerCase()) {
      console.log('  -> Uses: JSONPathCheck');
    }
  }
  
  console.log('\n========================================');
}

main().catch(console.error);
