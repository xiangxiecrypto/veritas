const hre = require("hardhat");

async function main() {
  console.log("Deploying TestPrimusRaw...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const primusTaskContract = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";

  const TestPrimusRaw = await hre.ethers.getContractFactory("TestPrimusRaw");
  const contract = await TestPrimusRaw.deploy(primusTaskContract);

  await contract.deployed();

  console.log(`\n✅ TestPrimusRaw Deployed!`);
  console.log(`Address: ${contract.address}`);
  console.log(`Tx: ${contract.deployTransaction.hash}`);
  console.log(`\nBasescan: https://sepolia.basescan.org/address/${contract.address}`);
}

main().catch(console.error);
