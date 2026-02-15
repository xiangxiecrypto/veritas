const hre = require("hardhat");

async function main() {
  console.log("Deploying VeritasValidationRegistryV3Final...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const identityRegistry = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  const reputationRegistry = "0x8004B663056A597Dffe9eCcC1965A193B7388713";
  const primusTaskContract = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";

  console.log("\nConstructor Args:");
  console.log("  IdentityRegistry:", identityRegistry);
  console.log("  ReputationRegistry:", reputationRegistry);
  console.log("  PrimusTaskContract:", primusTaskContract);

  const VeritasV3 = await hre.ethers.getContractFactory("VeritasValidationRegistryV3Final");
  const contract = await VeritasV3.deploy(identityRegistry, reputationRegistry, primusTaskContract);

  await contract.deployed();

  console.log(`\n✅ V3Final Deployed!`);
  console.log(`Address: ${contract.address}`);
  console.log(`Tx: ${contract.deployTransaction.hash}`);
  console.log(`\nBasescan: https://sepolia.basescan.org/address/${contract.address}`);
}

main().catch(console.error);
