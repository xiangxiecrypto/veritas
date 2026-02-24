const hre = require("hardhat");

async function main() {
  const APP = "0x8a6ebC841b5CDA5b630d1F7BA9216Aa2bcb253EF";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const checkCount = await app['checkCount(uint256)'](0);
  console.log('Check count for rule 0:', checkCount.toString());
  
  for (let i = 0; i < checkCount; i++) {
    const check = await app['checks(uint256,uint256)'](0, i);
    console.log(`\nCheck ${i}:`);
    console.log('  Contract:', check.checkContract);
    console.log('  Score:', check.score.toString());
    console.log('  Active:', check.active);
  }
}

main().catch(console.error);
