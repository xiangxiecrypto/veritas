const hre = require("hardhat");

/**
 * Deploy minimal Primus test contract
 */

async function main() {
  console.log("Deploying Minimal Primus Test Contract\n");

  const [deployer] = await hre.ethers.getSigners();
  
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Primus Task: ${PRIMUS_TASK}\n`);

  const MinimalTest = await hre.ethers.getContractFactory("MinimalPrimusTest");
  const test = await MinimalTest.deploy(PRIMUS_TASK);
  await test.deployed();

  console.log(`✅ Deployed: ${test.address}`);
  console.log(`\nNow testing submitTask...\n`);

  // Test with a simple URL
  const testUrl = "https://api.coinbase.com/v2/exchange-rates?currency=BTC";
  
  try {
    console.log(`Submitting task for: ${testUrl}\n`);
    
    const tx = await test.submitTask(testUrl, {
      value: hre.ethers.utils.parseEther("0.0001"),
      gasLimit: 300000
    });
    
    const receipt = await tx.wait();
    
    console.log(`✅ SUCCESS!`);
    console.log(`   Tx: ${tx.hash}`);
    console.log(`   Gas: ${receipt.gasUsed.toString()}\n`);
    
    // Get task events to find taskId
    const filter = test.filters.TaskCreated();
    const events = await test.queryFilter(filter, -5);
    
    if (events.length > 0) {
      const event = events[events.length - 1];
      console.log(`   Task Created: ${event.args.taskId}`);
    }
    
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(console.error);
