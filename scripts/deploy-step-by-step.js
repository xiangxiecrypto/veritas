// Simple deployment script - Step by Step
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Balance:", hre.ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");

  // Step 0: Deploy Registry
  console.log("=== STEP 0: Deploy VeritasValidationRegistry ===");
  const Registry = await hre.ethers.getContractFactory("VeritasValidationRegistry");
  const registry = await Registry.deploy();
  await registry.deployed();
  console.log("Registry deployed to:", registry.address);
  console.log("Transaction:", registry.deployTransaction.hash);
  console.log("");

  // Step 1: Deploy App
  console.log("=== STEP 1: Deploy PrimusVeritasApp ===");
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = await App.deploy(registry.address, PRIMUS_TASK);
  await app.deployed();
  console.log("App deployed to:", app.address);
  console.log("Transaction:", app.deployTransaction.hash);
  console.log("");

  // Step 2: Deploy Follower Check
  console.log("=== STEP 2: Deploy FollowerThresholdCheck ===");
  const Check = await hre.ethers.getContractFactory("FollowerThresholdCheck");
  const check = await Check.deploy();
  await check.deployed();
  console.log("Check deployed to:", check.address);
  console.log("Transaction:", check.deployTransaction.hash);
  console.log("");

  console.log("=== DEPLOYMENT COMPLETE ===");
  console.log("Registry:", registry.address);
  console.log("App:", app.address);
  console.log("Check:", check.address);
}

main().catch(console.error);
