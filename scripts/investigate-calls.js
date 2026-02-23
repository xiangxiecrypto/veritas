const hre = require("hardhat");

async function main() {
  const REPORT_TX = "0xe055797522767ccc8b5ef57706c98a68961f2e7b5d89323e4b1ee8bd0babb0ed";
  const APP = "0xcC0EB7ed46Ebcfbe5Ffee93c1467988eD668526a";
  const PRIMUS = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  
  console.log('\n🔍 Investigating Call 1 and Call 2\n');
  console.log('='.repeat(70));
  
  // Addresses from internal transactions
  const addresses = {
    '0x9717bdadb90a18e040e835b665f9e51eaa101ab1': 'Call 1 target',
    '0xdcf1ff951cd34fafae6abb6fad8a7b25a9259d8e': 'Call 2 target (attestor)',
    '0xcc0eb7ed46ebcfbe5ffee93c1467988ed668526a': 'Our contract (callback)'
  };
  
  for (const [addr, desc] of Object.entries(addresses)) {
    console.log(`\n📋 ${desc}: ${addr}`);
    console.log('─'.repeat(70));
    
    // Check if it's a contract
    const code = await hre.ethers.provider.getCode(addr);
    console.log('Is contract:', code.length > 2 ? 'Yes' : 'No (EOA)');
    
    // Check balance
    const balance = await hre.ethers.provider.getBalance(addr);
    console.log('Balance:', hre.ethers.utils.formatEther(balance), 'ETH');
    
    // Try to get transaction count
    const nonce = await hre.ethers.provider.getTransactionCount(addr);
    console.log('Nonce:', nonce);
    
    // Check recent transactions
    console.log('');
    console.log('Check on Basescan:');
    console.log(`  https://sepolia.basescan.org/address/${addr}`);
  }
  
  // Now trace the actual call to understand what happened
  console.log('\n\n📋 Detailed Trace:');
  console.log('─'.repeat(70));
  
  try {
    const trace = await hre.network.provider.send("debug_traceTransaction", [REPORT_TX, {tracer: 'callTracer'}]);
    
    function printCalls(t, depth = 0) {
      const indent = '  '.repeat(depth);
      const gasUsed = t.gasUsed ? parseInt(t.gasUsed, 16) : 0;
      const value = t.value ? hre.ethers.utils.formatEther(hre.ethers.BigNumber.from(t.value)) : '0';
      
      let desc = '';
      if (t.to) {
        if (t.to.toLowerCase() === APP.toLowerCase()) desc = ' (OUR CONTRACT)';
        else if (t.to.toLowerCase() === PRIMUS.toLowerCase()) desc = ' (PRIMUS)';
        else if (t.to.toLowerCase() === '0x9717bdadb90a18e040e835b665f9e51eaa101ab1') desc = ' (FEE RECIPIENT?)';
        else if (t.to.toLowerCase() === '0xdcf1ff951cd34fafae6abb6fad8a7b25a9259d8e') desc = ' (ATTESTOR)';
      }
      
      console.log(`${indent}${t.type} ${t.to || '?'}${desc}`);
      console.log(`${indent}  Gas: ${gasUsed}, Value: ${value} ETH`);
      
      if (t.error) {
        console.log(`${indent}  ❌ Error: ${t.error}`);
      }
      
      if (t.calls) {
        for (const call of t.calls) {
          printCalls(call, depth + 1);
        }
      }
    }
    
    printCalls(trace);
    
  } catch (e) {
    console.log('Trace error:', e.message);
  }
  
  console.log('\n' + '='.repeat(70));
}

main().catch(console.error);
