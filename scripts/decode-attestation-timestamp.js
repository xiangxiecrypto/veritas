const hre = require("hardhat");

async function main() {
  const txHash = "0xa7260725ea05107ce4096af21539d49f1330d7dbb02ae2445ba33ba90b8813d2";
  const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
  
  // Find DebugTimestamp event
  const APP = "0xc0A11e570cb99e719A01b59Bd7Ec80d5bd25Bb5A";
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  for (const log of receipt.logs) {
    try {
      const parsed = app.interface.parseLog({ topics: log.topics, data: log.data });
      if (parsed.name === 'DebugTimestamp') {
        console.log('attestationTime from event:', parsed.args[1].toString());
        
        // Convert if it looks like milliseconds
        const ts = parseInt(parsed.args[1].toString());
        if (ts > 1000000000000) {
          console.log('As milliseconds:', new Date(ts).toISOString());
          console.log('As seconds:', new Date(ts / 1000).toISOString());
        } else if (ts > 1000000000) {
          console.log('As seconds:', new Date(ts * 1000).toISOString());
        } else {
          console.log('Too small to be a real timestamp');
        }
      }
    } catch (e) {}
  }
  
  // Now decode the Primus attestation directly
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const taskId = "0xe6273d01d6bda61e344811a5fa9144549973099eb754f780c32e5d3ea52b45b3";
  
  // Get raw call data
  const tx = await hre.ethers.provider.getTransaction(txHash);
  console.log('\n=== Transaction input ===');
  console.log('Data length:', tx.data.length);
}

main().catch(console.error);
