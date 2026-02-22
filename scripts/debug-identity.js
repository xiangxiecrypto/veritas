const hre = require("hardhat");

async function main() {
  const APP = "0x4D7Ff64A76892fdacDc7ABB53a145dE019ceE1f4";
  const REGISTRY = "0x54be2Ce61135864D9a3c28877ab12758d027b520";
  
  const [signer] = await hre.ethers.getSigners();
  
  console.log('🔍 Debugging Identity Registry\n');
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const Registry = await hre.ethers.getContractFactory("VeritasValidationRegistry");
  const registry = Registry.attach(REGISTRY);
  
  const identityRegistry = await registry.getIdentityRegistry();
  console.log('Registry Identity:', identityRegistry);
  
  // Check if signer owns agent 0 there
  const Identity = new hre.ethers.Contract(
    identityRegistry,
    ["function ownerOf(uint256) view returns (address)"],
    signer
  );
  
  try {
    const owner = await Identity.ownerOf(0);
    console.log('Agent 0 owner:', owner);
    console.log('Signer:', signer.address);
    console.log('Match:', owner === signer.address);
  } catch (e) {
    console.log('Error:', e.message);
  }
}

main().catch(console.error);
