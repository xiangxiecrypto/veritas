const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const APP = "0x68c75b005C651D829238938d61bB25D75Cc4643E";
  
  console.log('\n🔍 Checking Transaction History\n');
  
  // Get the latest block
  const latestBlock = await hre.ethers.provider.getBlockNumber();
  console.log('Latest block:', latestBlock);
  
  // Check recent transactions from our address
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Query ValidationRequested events
  const filter = app.filters.ValidationRequested();
  const events = await app.queryFilter(filter, latestBlock - 100, latestBlock);
  
  console.log('\nRecent ValidationRequested events:');
  for (const event of events.slice(-5)) {
    console.log('\n  Task ID:', event.args.taskId);
    console.log('  Agent ID:', event.args.agentId.toString());
    console.log('  Rule ID:', event.args.ruleId.toString());
    console.log('  Block:', event.blockNumber);
    console.log('  Tx:', event.transactionHash);
  }
}

main().catch(console.error);
