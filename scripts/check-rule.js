const hre = require("hardhat");

async function main() {
  const APP = "0xA551A71A4feFa37d53339d1FA151628C38E8F7c3";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const ruleCount = await app.ruleCount();
  console.log('Rule count:', ruleCount.toString());
  
  for (let i = 0; i < ruleCount; i++) {
    const rule = await app.rules(i);
    console.log(`\nRule ${i}:`);
    console.log('  Active:', rule.active);
    console.log('  URL:', rule.url);
    console.log('  dataKey:', rule.dataKey);
  }
}

main().catch(console.error);
