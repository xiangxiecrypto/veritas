const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  DEPLOYING VERITAS V2 - 3 ON-CHAIN CHECKS                 ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  console.log("Deployer:", deployer.address);
  
  // Get contract factory
  const VeritasV2 = await hre.ethers.getContractFactory("VeritasValidationRegistryV2");
  
  // Deploy with constructor args
  const identityRegistry = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  const reputationRegistry = "0x8004B663056A597Dffe9eCcC1965A193B7388713";
  
  console.log("\nConstructor Args:");
  console.log("  IdentityRegistry:", identityRegistry);
  console.log("  ReputationRegistry:", reputationRegistry);
  
  console.log("\n⏳ Deploying...");
  const contract = await VeritasV2.deploy(identityRegistry, reputationRegistry);
  await contract.deployed();
  
  console.log("\n✅ Deployment Successful!");
  console.log("Contract Address:", contract.address);
  console.log("Transaction:", contract.deployTransaction.hash);
  
  // Verify initial state
  console.log("\n📊 Initial Configuration:");
  const apiCount = await contract.getApiCount();
  const keyCount = await contract.getRequiredDataKeyCount();
  console.log("  Allowed APIs:", apiCount.toString());
  
  const apis = await contract.getApiList();
  for (let i = 0; i < apis.length; i++) {
    console.log(`    ${i + 1}. ${apis[i]}`);
  }
  
  console.log("  Required Data Keys:", keyCount.toString());
  const keys = await contract.getRequiredDataKeys();
  for (let i = 0; i < keys.length; i++) {
    console.log(`    ${i + 1}. ${keys[i]}`);
  }
  
  console.log("\n🔗 Links:");
  console.log(`  Contract: https://sepolia.basescan.org/address/${contract.address}`);
  console.log(`  Tx: https://sepolia.basescan.org/tx/${contract.deployTransaction.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
