const hardhat = require("hardhat");
const { ethers } = hardhat;

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🚀 Deploying VeritasValidationRegistry");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", (await deployer.getBalance()).toString());
  
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "(Chain ID:", network.chainId, ")");
  
  // Base Sepolia ERC-8004 Identity Registry
  const IDENTITY_REGISTRY_SEPOLIA = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  
  // Deploy VeritasValidationRegistry
  const VeritasValidationRegistry = await ethers.getContractFactory("VeritasValidationRegistry");
  
  console.log("\n⏳ Deploying...");
  console.log("Using Identity Registry:", IDENTITY_REGISTRY_SEPOLIA);
  const registry = await VeritasValidationRegistry.deploy(IDENTITY_REGISTRY_SEPOLIA);
  
  await registry.deployed();
  
  console.log("\n✅ VeritasValidationRegistry deployed!");
  console.log("Address:", registry.address);
  console.log("Transaction:", registry.deployTransaction.hash);
  
  // Save deployment info
  const deploymentInfo = {
    contract: "VeritasValidationRegistry",
    address: registry.address,
    deployer: deployer.address,
    network: network.name,
    chainId: network.chainId,
    timestamp: new Date().toISOString(),
    transactionHash: registry.deployTransaction.hash
  };
  
  console.log("\n📦 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  // Update SDK with new address
  console.log("\n📝 Update src/sdk.ts with:");
  console.log(`VALIDATION_REGISTRY_ADDRESS = "${registry.address}"`);
  
  // Verify on BaseScan if on mainnet/sepolia
  if (network.chainId === 8453 || network.chainId === 84532) {
    console.log("\n📋 Verify on BaseScan:");
    console.log(`npx hardhat verify --network ${network.chainId === 8453 ? 'base' : 'baseSepolia'} ${registry.address} ${IDENTITY_REGISTRY_SEPOLIA}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
