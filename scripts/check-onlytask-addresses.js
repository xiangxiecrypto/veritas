const hre = require("hardhat");

async function main() {
  const APP = "0xecD605f0B4167210532Ff9860595E7ce3Acc8f86";
  const PRIMUS_PROXY = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const REPORT_TX = "0x5266713983fd3fe571e577a62ac8fd9d89e348e4c17e84a9b316fe581c4319ab";
  
  console.log('\n🔍 Checking onlyTask Addresses\n');
  console.log('='.repeat(70));
  console.log('');
  
  const [signer] = await hre.ethers.getSigners();
  
  // 1. Check what address our contract expects (primusTask)
  console.log('1️⃣ Our Contract (PrimusVeritasApp)');
  console.log('─'.repeat(70));
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const storedPrimusTask = await app.primusTask();
  console.log('Stored primusTask address:', storedPrimusTask);
  console.log('Expected (Primus proxy):  ', PRIMUS_PROXY);
  console.log('Match:', storedPrimusTask.toLowerCase() === PRIMUS_PROXY.toLowerCase() ? '✅ YES' : '❌ NO');
  console.log('');
  
  // 2. Check the transaction that called reportResult
  console.log('2️⃣ ReportResult Transaction');
  console.log('─'.repeat(70));
  
  const tx = await hre.ethers.provider.getTransaction(REPORT_TX);
  console.log('Transaction From:', tx.from);
  console.log('Transaction To:  ', tx.to);
  console.log('');
  
  // 3. Check internal transactions (the actual callback call)
  console.log('3️⃣ Internal Transactions (Callback Calls)');
  console.log('─'.repeat(70));
  
  const receipt = await hre.ethers.provider.getTransactionReceipt(REPORT_TX);
  
  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];
    if (log.address.toLowerCase() === PRIMUS_PROXY.toLowerCase()) {
      // This is a Primus event
      console.log(`Log ${i} from Primus`);
    }
  }
  
  // Try to trace the internal call
  console.log('');
  console.log('Trying to trace internal calls...');
  
  try {
    const trace = await hre.network.provider.send("debug_traceTransaction", [REPORT_TX]);
    
    let foundCallbackCall = false;
    for (const log of trace.structLogs) {
      if (log.op === 'CALL' && log.stack) {
        const toIndex = log.stack.length - 2;
        if (toIndex >= 0) {
          const to = '0x' + log.stack[toIndex].slice(-40);
          if (to.toLowerCase() === APP.toLowerCase()) {
            foundCallbackCall = true;
            console.log('Found CALL to our contract!');
            console.log('  Gas available:', log.gas);
            console.log('  Would check: msg.sender ==', PRIMUS_PROXY);
          }
        }
      }
    }
    
    if (!foundCallbackCall) {
      console.log('No direct CALL to our contract found in trace');
    }
  } catch (e) {
    console.log('Trace not available:', e.message);
  }
  
  console.log('');
  console.log('='.repeat(70));
  console.log('Summary');
  console.log('─'.repeat(70));
  console.log('Our contract expects Primus at:', storedPrimusTask);
  console.log('Transaction goes to Primus at: ', PRIMUS_PROXY);
  console.log('If Primus calls us, msg.sender should be:', PRIMUS_PROXY);
  console.log('');
  console.log('If they match, onlyTask should PASS');
  console.log('If callback is failing, it might be gas or other issue');
}

main().catch(console.error);
