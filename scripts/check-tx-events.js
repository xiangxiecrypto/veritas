const hre = require("hardhat");

async function main() {
  const APP = "0xc0A11e570cb99e719A01b59Bd7Ec80d5bd25Bb5A";
  const txHash = "0xa7260725ea05107ce4096af21539d49f1330d7dbb02ae2445ba33ba90b8813d2";
  
  const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  console.log('Block:', receipt.blockNumber);
  console.log('Gas used:', receipt.gasUsed.toString());
  console.log('Status:', receipt.status);
  console.log('Logs:', receipt.logs.length);
  
  console.log('\nEvents:');
  for (const log of receipt.logs) {
    try {
      const parsed = app.interface.parseLog({ topics: log.topics, data: log.data });
      console.log('  ', parsed.name);
      if (parsed.name === 'ValidationCompleted') {
        console.log('     Score:', parsed.args.score.toString());
      }
    } catch (e) {
      // Not our event
    }
  }
}

main().catch(console.error);
