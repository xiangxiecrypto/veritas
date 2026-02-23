const hre = require("hardhat");

async function main() {
  const APP = "0x68c75b005C651D829238938d61bB25D75Cc4643E";
  const REGISTRY = "0xAeFdE0707014b6540128d3835126b53F073fEd40";
  const taskId = "0x3647c19ede2028975260f9f350abb1ee41f1e8c41ff8b7d6b2fd948497241774";
  
  console.log('\n🔍 Registry Check\n');
  console.log('='.repeat(70));
  
  const Registry = await hre.ethers.getContractFactory("VeritasValidationRegistry");
  const registry = Registry.attach(REGISTRY);
  
  // Get validation info from registry
  const filter = registry.filters.ValidationResponse(taskId);
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  const events = await registry.queryFilter(filter, currentBlock - 100, currentBlock);
  
  console.log('ValidationResponse events:', events.length);
  
  if (events.length > 0) {
    const event = events[events.length - 1];
    console.log('\n✅ Found in Registry:');
    console.log('  Request Hash:', event.args.requestHash);
    console.log('  Score:', event.args.response.toString());
    console.log('  URI:', event.args.responseURI);
    console.log('  Tag:', event.args.tag);
    console.log('  Block:', event.blockNumber);
  }
  
  console.log('='.repeat(70));
}

main().catch(console.error);
