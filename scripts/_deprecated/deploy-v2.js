const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Get contract factory
  const VeritasV2 = await hre.ethers.getContractFactory("VeritasValidationRegistryV2");
  
  // Deploy with constructor args
  // IdentityRegistry and ReputationRegistry addresses on Base Sepolia
  const identityRegistry = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  const reputationRegistry = "0x8004B663056A597Dffe9eCcC1965A193B7388713";
  
  console.log("Deploying VeritasValidationRegistryV2...");
  console.log("IdentityRegistry:", identityRegistry);
  console.log("ReputationRegistry:", reputationRegistry);
  
  const contract = await VeritasV2.deploy(identityRegistry, reputationRegistry);
  await contract.deployed();
  
  console.log("\n✅ Deployment Successful!");
  console.log("Contract Address:", contract.address);
  console.log("Transaction:", contract.deployTransaction.hash);
  console.log("\nBasescan: https://sepolia.basescan.org/address/" + contract.address);
  console.log("Tx: https://sepolia.basescan.org/tx/" + contract.deployTransaction.hash);
  
  // Verify initial state
  console.log("\n📊 Initial State:");
  console.log("API Count:", (await contract.getApiCount()).toString());
  console.log("Required Data Keys:", (await contract.getRequiredDataKeyCount()).toString());
  console.log("Owner:", await contract.owner());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
