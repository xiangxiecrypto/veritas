const hre = require("hardhat");

async function main() {
  const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
  const CHECK0 = "0x374bE654c08DE2C688f49d13E65b34C087e7e49E";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Get check[1][0]
  const check = await app.checks(1, 0);
  console.log('Check[1][0] contract:', check.checkContract);
  console.log('Expected:', CHECK0);
  console.log('Match:', check.checkContract.toLowerCase() === CHECK0.toLowerCase());
  console.log('Score:', check.score.toString());
  console.log('Active:', check.active);
}

main().catch(console.error);
