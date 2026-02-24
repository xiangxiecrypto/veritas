const hre = require("hardhat");

async function main() {
  const APP = "0x8a6ebC841b5CDA5b630d1F7BA9216Aa2bcb253EF";
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const rule = await app.rules(2);
  console.log('Rule 2:');
  console.log('URL:', rule.url);
  console.log('dataKey:', rule.dataKey);
  console.log('parsePath:', rule.parsePath);
  console.log('Active:', rule.active);
}

main().catch(console.error);
