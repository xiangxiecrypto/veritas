const hre = require("hardhat");

async function main() {
  console.log("Deploying VeritasValidationRegistry...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const identityRegistry = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  const reputationRegistry = "0x8004B663056A597Dffe9eCcC1965A193B7388713";
  const primusTaskContract = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";

  const Veritas = await hre.ethers.getContractFactory("VeritasValidationRegistry");
  const contract = await Veritas.deploy(identityRegistry, reputationRegistry, primusTaskContract);

  await contract.deployed();

  console.log(`\n✅ Deployed!`);
  console.log(`Address: ${contract.address}`);
  console.log(`Tx: ${contract.deployTransaction.hash}`);
  console.log(`\nBasescan: https://sepolia.basescan.org/address/${contract.address}`);
}

main().catch(console.error);
