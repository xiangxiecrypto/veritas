const hre = require("hardhat");

async function main() {
  const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
  const submitTx = "0x349cbd17afc98cb384d8da855c4b35db31b1f7d004f46a49316d6e3ac4c55f8e";
  
  const receipt = await hre.ethers.provider.getTransactionReceipt(submitTx);
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  console.log('Events:', receipt.logs.length);
  
  for (const log of receipt.logs) {
    try {
      const parsed = app.interface.parseLog({ topics: log.topics, data: log.data });
      if (parsed.name === 'ValidationCompleted') {
        console.log('✅ Score:', parsed.args.score.toString());
      }
      if (parsed.name === 'CheckPassed') {
        console.log('✅ CheckPassed, score:', parsed.args.score.toString());
      }
      if (parsed.name === 'CheckFailed') {
        console.log('❌ CheckFailed');
      }
    } catch (e) {}
  }
}

main().catch(console.error);
