const hre = require("hardhat");

async function main() {
  const REGISTRY = "0xAeFdE0707014b6540128d3835126b53F073fEd40";
  const taskId = "0x3647c19ede2028975260f9f350abb1ee41f1e8c41ff8b7d6b2fd948497241774";
  
  console.log('\n🔍 Registry Query\n');
  console.log('='.repeat(70));
  
  const Registry = await hre.ethers.getContractFactory("VeritasValidationRegistry");
  const registry = Registry.attach(REGISTRY);
  
  // Query all ValidationResponse events
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  const filter = registry.filters.ValidationResponse();
  const events = await registry.queryFilter(filter, currentBlock - 100, currentBlock);
  
  console.log('Recent ValidationResponse events:', events.length);
  
  // Find events for our task
  for (const event of events.reverse()) {
    // taskId is requestHash
    if (event.args.requestHash.toLowerCase() === taskId.toLowerCase()) {
      console.log('\n✅ Found:');
      console.log('  Request Hash:', event.args.requestHash);
      console.log('  Score:', event.args.response.toString());
      console.log('  URI:', event.args.responseURI);
      console.log('  Block:', event.blockNumber);
      console.log('  Tx:', event.transactionHash);
      break;
    }
  }
  
  console.log('='.repeat(70));
}

main().catch(console.error);
