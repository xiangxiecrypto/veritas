const hre = require("hardhat");

async function main() {
  const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
  const submitTx = "0x5f1ae3815b5b95e3534f7e515e92bae1c6135461804e5cbdf5a55a841e7bbfb7";
  
  const receipt = await hre.ethers.provider.getTransactionReceipt(submitTx);
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  console.log('Logs:', receipt.logs.length);
  
  for (const log of receipt.logs) {
    try {
      const parsed = app.interface.parseLog({ topics: log.topics, data: log.data });
      console.log('Event:', parsed.name);
      if (parsed.name === 'ValidationCompleted') {
        console.log('Score:', parsed.args.score.toString());
      }
    } catch (e) {}
  }
}

main().catch(console.error);
