const hardhat = require("hardhat");
const { ethers } = hardhat;

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🔑 Authorizing validator on VeritasValidationRegistry");
  console.log("Deployer/Owner:", deployer.address);
  
  // Validation Registry address (already deployed)
  const VALIDATION_REGISTRY_ADDRESS = "0x613BD0Ad671B1859e16ACaCe33352B9412CA3A14";
  
  // Wallet to authorize (the test wallet)
  const WALLET_TO_AUTHORIZE = "0x89BBf3451643eef216c3A60d5B561c58F0D8adb9";
  
  // Get contract instance
  const VeritasValidationRegistry = await ethers.getContractFactory("VeritasValidationRegistry");
  const registry = VeritasValidationRegistry.attach(VALIDATION_REGISTRY_ADDRESS);
  
  // Check current authorization status
  const isAuthorizedBefore = await registry.isAuthorizedValidator(WALLET_TO_AUTHORIZE);
  console.log(`\nAuthorization status before: ${isAuthorizedBefore ? '✅ Authorized' : '❌ Not authorized'}`);
  
  if (!isAuthorizedBefore) {
    console.log(`\n⏳ Adding ${WALLET_TO_AUTHORIZE} as authorized validator...`);
    const tx = await registry.addAuthorizedValidator(WALLET_TO_AUTHORIZE);
    console.log(`Transaction: ${tx.hash}`);
    await tx.wait();
    console.log("✅ Authorization complete!");
  }
  
  // Verify authorization
  const isAuthorizedAfter = await registry.isAuthorizedValidator(WALLET_TO_AUTHORIZE);
  console.log(`\nAuthorization status after: ${isAuthorizedAfter ? '✅ Authorized' : '❌ Not authorized'}`);
  
  console.log("\n🔗 Basescan Links:");
  console.log(`   Contract: https://sepolia.basescan.org/address/${VALIDATION_REGISTRY_ADDRESS}`);
  console.log(`   Wallet: https://sepolia.basescan.org/address/${WALLET_TO_AUTHORIZE}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });
