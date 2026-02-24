const hre = require("hardhat");

async function main() {
  const APP = "0x8a6ebC841b5CDA5b630d1F7BA9216Aa2bcb253EF";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Check rule 0
  const rule0 = await app.rules(0);
  console.log('Rule 0:');
  console.log('  URL:', rule0.url);
  console.log('  dataKey:', rule0.dataKey);
  
  // Try to get check count for rule 0
  const checkCount = await app['checkCount(uint256)'](0);
  console.log('\nCheck count for rule 0:', checkCount.toString());
  
  // Get check at index 0
  if (checkCount > 0) {
    // Check is stored in a mapping, need to access directly
    // checks[ruleId][checkId] => Check struct
    const check = await app['checks(uint256,uint256)'](0, 0);
    console.log('\nCheck 0 for rule 0:');
    console.log('  Contract:', check.checkContract);
    console.log('  Score:', check.score.toString());
    console.log('  Active:', check.active);
  }
}

main().catch(console.error);
