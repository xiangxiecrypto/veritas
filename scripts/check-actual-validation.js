const hre = require("hardhat");

async function main() {
  const APP = "0x8a6ebC841b5CDA5b630d1F7BA9216Aa2bcb253EF";
  const CHECK = "0xC883bEd2213E129c12F6079FfB951526DcAcc26a"; // From test output
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Get check for rule 0
  const check = await app.getCheck(0, 0);
  console.log('Check contract for rule 0, check 0:');
  console.log('  Address:', check.checkContract);
  console.log('  Score:', check.score.toString());
  console.log('  Active:', check.active);
  console.log('');
  console.log('Expected check from test:', CHECK);
  console.log('Match:', check.checkContract.toLowerCase() === CHECK.toLowerCase());
}

main().catch(console.error);
