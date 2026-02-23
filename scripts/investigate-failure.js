const hre = require("hardhat");

async function main() {
  const APP = "0xecD605f0B4167210532Ff9860595E7ce3Acc8f86";
  const PRIMUS = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const REPORT_TX = "0x5266713983fd3fe571e577a62ac8fd9d89e348e4c17e84a9b316fe581c4319ab";
  
  console.log('\n🔍 Investigating Callback Failure\n');
  console.log('='.repeat(70));
  console.log('');
  
  const [signer] = await hre.ethers.getSigners();
  
  // 1. Check who called reportResult
  console.log('1️⃣ Report Transaction Details');
  console.log('─'.repeat(70));
  
  const receipt = await hre.ethers.provider.getTransactionReceipt(REPORT_TX);
  const tx = await hre.ethers.provider.getTransaction(REPORT_TX);
  
  console.log('From:', tx.from);
  console.log('To:', tx.to);
  console.log('Gas Limit:', tx.gasLimit.toString());
  console.log('Gas Used:', receipt.gasUsed.toString());
  console.log('');
  
  // 2. Check our contract's onlyTask modifier
  console.log('2️⃣ Checking onlyTask Modifier');
  console.log('─'.repeat(70));
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  console.log('Primus Task address (from contract):', await app.primusTask());
  console.log('Expected (actual Primus):', PRIMUS);
  console.log('Match:', (await app.primusTask()).toLowerCase() === PRIMUS.toLowerCase() ? '✅ YES' : '❌ NO');
  console.log('');
  
  // 3. The issue: reportResult was called by attestor, not Primus contract
  console.log('3️⃣ The Problem');
  console.log('─'.repeat(70));
  console.log('ReportResult caller:', tx.from);
  console.log('Primus contract:', PRIMUS);
  console.log('');
  console.log('❌ ISSUE: reportResult was called directly by the attestor');
  console.log('   NOT by the Primus TaskContract itself!');
  console.log('');
  console.log('Our onlyTask modifier checks:');
  console.log('  require(msg.sender == address(primusTask))');
  console.log('');
  console.log('But msg.sender is the attestor, not Primus!');
  console.log('');
  
  // 4. Solution
  console.log('4️⃣ Solution');
  console.log('─'.repeat(70));
  console.log('The callback should be called BY the Primus TaskContract');
  console.log('when processing the reportResult, not by the attestor directly.');
  console.log('');
  console.log('Looking at Primus contract flow:');
  console.log('1. Attestor calls reportResult() on Primus');
  console.log('2. Primus should call callback.reportTaskResultCallback()');
  console.log('');
  console.log('But it seems the callback is being called with the attestor');
  console.log('as msg.sender instead of the Primus contract.');
  console.log('');
  
  // 5. Check if this is a gas issue
  console.log('5️⃣ Gas Analysis');
  console.log('─'.repeat(70));
  console.log('Gas used in reportResult:', receipt.gasUsed.toString());
  console.log('Gas limit:', tx.gasLimit.toString());
  console.log('Gas left:', tx.gasLimit.sub(receipt.gasUsed).toString());
  console.log('');
  
  if (receipt.gasUsed.lt(tx.gasLimit.mul(80).div(100))) {
    console.log('✅ Gas was sufficient (used < 80% of limit)');
  } else {
    console.log('⚠️ High gas usage - might be gas issue');
  }
}

main().catch(console.error);
