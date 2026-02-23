const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const submitTxHash = "0xbe9e50fefb24d8027539974510f8923f9308d982aa3b2347cdc50bd60ac395f5";
  
  console.log('\n📊 Checking Result\n');
  
  const receipt = await ethers.provider.getTransactionReceipt(submitTxHash);
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach("0x68c75b005C651D829238938d61bB25D75Cc4643E");
  
  // Parse events
  for (const log of receipt.logs) {
    try {
      const parsed = app.interface.parseLog({ topics: log.topics, data: log.data });
      if (parsed.name === 'ValidationCompleted') {
        console.log('✅ ValidationCompleted Event:');
        console.log('  Task ID:', parsed.args.taskId);
        console.log('  Score:', parsed.args.score.toString());
      } else if (parsed.name === 'CheckPassed') {
        console.log('✅ CheckPassed:');
        console.log('  Rule ID:', parsed.args.ruleId.toString());
        console.log('  Check ID:', parsed.args.checkId.toString());
        console.log('  Score:', parsed.args.score.toString());
      }
    } catch (e) {}
  }
}

main().catch(console.error);
