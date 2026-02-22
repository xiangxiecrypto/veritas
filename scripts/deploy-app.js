// Deploy PrimusVeritasApp - uses already deployed VeritasValidationRegistry
const hre = require("hardhat");

async function main() {
  const REGISTRY_ADDRESS = "0x54be2Ce61135864D9a3c28877ab12758d027b520";
  const PRIMUS_TASK_ADDRESS = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";

  const [signer] = await hre.ethers.getSigners();
  console.log("Signer:", await signer.getAddress());
  console.log("Balance:", hre.ethers.utils.formatEther(await signer.getBalance()), "ETH");
  console.log("Registry:", REGISTRY_ADDRESS);
  console.log("Primus Task:", PRIMUS_TASK_ADDRESS);

  console.log("\nDeploying PrimusVeritasApp...");
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = await App.deploy(REGISTRY_ADDRESS, PRIMUS_TASK_ADDRESS);
  console.log("Transaction sent:", app.deployTransaction.hash);
  await app.deployed();
  console.log("✅ Deployed at:", app.address);
  console.log("Explorer:", `https://sepolia.basescan.org/address/${app.address}`);
}

main().catch(console.error);
