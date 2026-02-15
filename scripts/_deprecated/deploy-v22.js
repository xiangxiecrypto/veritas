const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying V2.2 with recipient check...");
  console.log("Deployer:", deployer.address);
  
  const VeritasV2 = await hre.ethers.getContractFactory("VeritasValidationRegistryV2");
  
  const identityRegistry = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  const reputationRegistry = "0x8004B663056A597Dffe9eCcC1965A193B7388713";
  
  const contract = await VeritasV2.deploy(identityRegistry, reputationRegistry);
  await contract.deployed();
  
  console.log("✅ V2.2 Deployed!");
  console.log("Address:", contract.address);
  console.log("Tx:", contract.deployTransaction.hash);
  console.log("\nBasescan:", `https://sepolia.basescan.org/address/${contract.address}`);
}

main().catch(console.error);
