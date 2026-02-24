const hre = require("hardhat");

async function main() {
  // Load both contracts
  const Check = await hre.ethers.getContractFactory("SimpleVerificationCheck");
  const check = await Check.deploy();
  await check.deployed();
  console.log('Check:', check.address);
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  
  // Get interface of check
  console.log('\nCheck ABI:');
  console.log(JSON.stringify(check.interface.getFunction('validate'), null, 2));
  
  console.log('\nICustomCheck validate signature:');
  const iface = new hre.ethers.utils.Interface([
    "function validate(bytes calldata attestationUrl, bytes calldata attestationResponseResolve, string calldata attestationData, string calldata ruleUrlTemplate, string calldata ruleDataKey, string calldata ruleParsePath, bytes calldata params) external view returns (bool passed)"
  ]);
  console.log(JSON.stringify(iface.getFunction('validate'), null, 2));
}

main().catch(console.error);
