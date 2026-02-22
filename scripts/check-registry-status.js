const hre = require("hardhat");

async function main() {
  const REGISTRY = "0x54be2Ce61135864D9a3c28877ab12758d027b520";
  const [signer] = await hre.ethers.getSigners();
  
  console.log('Checking VeritasValidationRegistry...\n');
  
  const Registry = await hre.ethers.getContractFactory("VeritasValidationRegistry");
  const registry = Registry.attach(REGISTRY);
  
  const identityRegistry = await registry.getIdentityRegistry();
  console.log('Identity Registry:', identityRegistry);
  
  if (identityRegistry === '0x0000000000000000000000000000000000000000') {
    console.log('\n❌ IDENTITY REGISTRY NOT CONFIGURED!\n');
    console.log('The VeritasValidationRegistry needs to be initialized with an ERC-8004 identity registry.');
    console.log('Without this, agents cannot be registered or verified.\n');
    console.log('Solution options:');
    console.log('1. Deploy an ERC-8004 IdentityRegistry contract');
    console.log('2. Initialize VeritasValidationRegistry with the identity registry address');
    console.log('3. Register an agent in the identity registry');
    console.log('4. Then verify with the agentId');
  } else {
    console.log('\n✅ Identity registry configured:', identityRegistry);
    // Query agents here if needed
  }
}

main().catch(console.error);
