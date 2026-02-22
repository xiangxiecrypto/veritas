const hre = require("hardhat");

async function main() {
  const APP = "0x49a3f6d0ce37D4F5D2C24F1BCB059ac3F39682d6";
  const REGISTRY = "0x54be2Ce61135864D9a3c28877ab12758d027b520";
  const MY_IDENTITY = "0xDc561AccDF2BA01BaC83Aef694bBdEAE31A3Fe1F";
  const STANDARD_IDENTITY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  
  const [signer] = await hre.ethers.getSigners();
  
  const Registry = await hre.ethers.getContractFactory("VeritasValidationRegistry");
  const registry = Registry.attach(REGISTRY);
  
  const identityInRegistry = await registry.getIdentityRegistry();
  
  console.log('Registry Identity:', identityInRegistry);
  console.log('My SimpleIdentity:', MY_IDENTITY);
  console.log('Standard ERC-8004:', STANDARD_IDENTITY);
  console.log('');
  
  // Check ownership in the registry's identity
  const Identity = new hre.ethers.Contract(
    identityInRegistry,
    ["function ownerOf(uint256) view returns (address)"],
    signer
  );
  
  for (let i = 0; i < 5; i++) {
    try {
      const owner = await Identity.ownerOf(i);
      console.log(`Agent ${i} owner: ${owner} ${owner === signer.address ? '✅ (YOU)' : ''}`);
    } catch (e) {
      // Agent doesn't exist
    }
  }
}

main().catch(console.error);
