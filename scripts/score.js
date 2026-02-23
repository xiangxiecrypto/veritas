const hre = require("hardhat");

async function main() {
  const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
  const submitTx = "0xec64341d2d2c01971d47beef1503e4eb6c4ad10c931154a3381ea0ec9300f08c";
  
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
    } catch (e) {}
  }
}

main().catch(console.error);
