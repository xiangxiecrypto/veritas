const hre = require("hardhat");
const { ethers } = hre;

const PROXY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

async function main() {
  // ERC-1967 implementation slot
  const implSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  
  const impl = await ethers.provider.getStorageAt(PROXY, implSlot);
  const implAddress = "0x" + impl.slice(26);
  
  console.log('Implementation:', implAddress);
  
  // Verify it's a contract
  const code = await ethers.provider.getCode(implAddress);
  console.log('Has code:', code !== '0x' ? 'YES' : 'NO');
}

main().catch(console.error);
