const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Signer address:", await signer.getAddress());
  console.log("Balance:", hre.ethers.utils.formatEther(await signer.getBalance()), "ETH");
  console.log("Nonce:", await signer.getTransactionCount());
  
  console.log("\nDeploying VeritasValidationRegistry...");
  const Registry = await hre.ethers.getContractFactory("VeritasValidationRegistry");
  const registry = await Registry.deploy();
  console.log("Transaction sent:", registry.deployTransaction.hash);
  await registry.deployed();
  console.log("✅ Deployed at:", registry.address);
  console.log("Explorer:", `https://sepolia.basescan.org/address/${registry.address}`);
}

main().catch(console.error);
