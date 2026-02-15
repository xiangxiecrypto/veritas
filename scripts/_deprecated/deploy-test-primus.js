const hre = require("hardhat");

async function main() {
  console.log("Deploying TestPrimusQuery...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // Primus Task Contract on Base Sepolia
  const primusTaskContract = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";

  const TestPrimusQuery = await hre.ethers.getContractFactory("TestPrimusQuery");
  const contract = await TestPrimusQuery.deploy(primusTaskContract);

  await contract.deployed();

  console.log(`\n✅ TestPrimusQuery Deployed!`);
  console.log(`Address: ${contract.address}`);
  console.log(`Tx: ${contract.deployTransaction.hash}`);
  console.log(`\nBasescan: https://sepolia.basescan.org/address/${contract.address}`);
}

main().catch(console.error);
