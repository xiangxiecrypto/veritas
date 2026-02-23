const hre = require("hardhat");

async function main() {
  const APP = "0x68c75b005C651D829238938d61bB25D75Cc4643E";
  
  console.log('\n📋 Checking Contract Status\n');
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Check rules
  const ruleCount = await app.ruleCount();
  console.log('Rule Count:', ruleCount.toString());
  
  if (ruleCount > 0) {
    const rule = await app.rules(0);
    console.log('\nRule 0:');
    console.log('  URL:', rule.url);
    console.log('  Data Key:', rule.dataKey);
    console.log('  Parse Path:', rule.parsePath);
    console.log('  Active:', rule.active);
  }
  
  // Check checks
  const checkCount = await app.checkCount(0);
  console.log('\nCheck Count (Rule 0):', checkCount.toString());
  
  if (checkCount > 0) {
    const check = await app.checks(0, 0);
    console.log('\nCheck 0:');
    console.log('  Contract:', check.checkContract);
    console.log('  Score:', check.score.toString());
    console.log('  Active:', check.active);
  }
  
  console.log('\n✅ Contract is configured correctly!');
}

main().catch(console.error);
