const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();
  console.log("Signer:", signers[0].address);
  console.log("Balance:", hre.ethers.utils.formatEther(await signers[0].getBalance()));
}

main();
