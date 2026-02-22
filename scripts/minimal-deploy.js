// Minimal test deployment
const hre = require("hardhat");

async function main() {
  console.log("Starting minimal test...");
  
  const [signer] = await hre.ethers.getSigners();
  console.log("Signer:", signer.address);
  
  const balance = await signer.getBalance();
  console.log("Balance:", hre.ethers.utils.formatEther(balance), "ETH");
  
  console.log("Creating factory...");
  const Registry = await hre.ethers.getContractFactory("VeritasValidationRegistry");
  
  console.log("Deploying...");
  const registry = await Registry.deploy();
  console.log("Deploy transaction sent:", registry.deployTransaction.hash);
  
  console.log("Waiting for confirmation...");
  await registry.deployed();
  
  console.log("SUCCESS!");
  console.log("Address:", registry.address);
  console.log("Tx:", registry.deployTransaction.hash);
}

main().catch(e => {
  console.error("ERROR:", e.message);
  console.error(e.stack);
});
