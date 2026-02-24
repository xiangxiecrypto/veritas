const hre = require("hardhat");

async function main() {
  const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
  
  const [signer] = await hre.ethers.getSigners();
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const count = await app.checkCount(1);
  console.log('Rule 1 check count:', count.toString());
  
  for (let i = 0; i < count; i++) {
    const check = await app.checks(1, i);
    console.log(`\nCheck ${i}:`);
    console.log('  Contract:', check.checkContract);
    console.log('  Score:', check.score.toString());
    console.log('  Active:', check.active);
  }
}

main().catch(console.error);
