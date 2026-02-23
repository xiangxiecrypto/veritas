const hre = require("hardhat");

async function main() {
  const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
  const submitTx = "0x3f2895b52a963b89d06842bc7686392ad7b5e6724de0591d3b888349fd0d7408";
  
  const receipt = await hre.ethers.provider.getTransactionReceipt(submitTx);
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  for (const log of receipt.logs) {
    try {
      const parsed = app.interface.parseLog({ topics: log.topics, data: log.data });
      if (parsed.name === 'ValidationCompleted') {
        console.log('Score:', parsed.args.score.toString());
      }
      if (parsed.name === 'CheckPassed') {
        console.log('Check passed, score:', parsed.args.score.toString());
      }
      if (parsed.name === 'CheckFailed') {
        console.log('Check failed');
      }
    } catch (e) {}
  }
}

main().catch(console.error);
