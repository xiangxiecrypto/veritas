const hre = require("hardhat");

async function main() {
  const REPORT_TX = "0xe055797522767ccc8b5ef57706c98a68961f2e7b5d89323e4b1ee8bd0babb0ed";
  const APP = "0xcC0EB7ed46Ebcfbe5Ffee93c1467988eD668526a";
  const PRIMUS = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  
  console.log('\n🔍 Tracing Exact Failure\n');
  console.log('='.repeat(70));
  console.log('Report Tx:', REPORT_TX);
  console.log('');
  
  try {
    const trace = await hre.network.provider.send("debug_traceTransaction", [REPORT_TX, {tracer: 'callTracer'}]);
    
    console.log('📋 Call Trace:');
    console.log('─'.repeat(70));
    
    function printTrace(t, depth = 0) {
      const indent = '  '.repeat(depth);
      const gasUsed = t.gasUsed ? parseInt(t.gasUsed, 16) : 0;
      const status = t.error ? '❌ FAILED' : '✅';
      
      console.log(`${indent}${status} ${t.type || 'CALL'} ${t.to || '?'} (gas: ${gasUsed})`);
      
      if (t.error) {
        console.log(`${indent}   Error: ${t.error}`);
      }
      
      if (t.output) {
        console.log(`${indent}   Output: ${t.output.slice(0, 100)}...`);
      }
      
      if (t.calls) {
        for (const call of t.calls) {
          printTrace(call, depth + 1);
        }
      }
    }
    
    printTrace(trace);
    
    // Find failed calls
    console.log('\n📋 Failed Calls:');
    console.log('─'.repeat(70));
    
    function findFailed(t, path = 'root') {
      const results = [];
      if (t.error) {
        results.push({
          path: path,
          to: t.to,
          error: t.error,
          gasUsed: t.gasUsed ? parseInt(t.gasUsed, 16) : 0
        });
      }
      if (t.calls) {
        for (let i = 0; i < t.calls.length; i++) {
          results.push(...findFailed(t.calls[i], `${path}[${i}]`));
        }
      }
      return results;
    }
    
    const failed = findFailed(trace);
    
    if (failed.length === 0) {
      console.log('No explicit failures found in trace');
    } else {
      for (const f of failed) {
        console.log(`\nPath: ${f.path}`);
        console.log(`  To: ${f.to}`);
        console.log(`  Gas Used: ${f.gasUsed}`);
        console.log(`  Error: ${f.error}`);
        
        // Check if this is our contract
        if (f.to && f.to.toLowerCase() === APP.toLowerCase()) {
          console.log('  ⚠️ This is our PrimusVeritasApp!');
          
          // Try to decode the error
          if (f.error && f.error.includes('0x')) {
            const errorData = f.error;
            console.log(`  Error data: ${errorData}`);
          }
        }
      }
    }
    
  } catch (e) {
    console.log('Trace error:', e.message);
    
    // Try alternative approach - check events
    console.log('\n📋 Checking Events Instead:');
    console.log('─'.repeat(70));
    
    const receipt = await hre.ethers.provider.getTransactionReceipt(REPORT_TX);
    
    const primusInterface = new hre.ethers.utils.Interface([
      'event CallbackFailed(bytes32 indexed taskId, address callback, string reason)',
      'event ReportResult(address indexed attestor, bytes32 indexed taskId, address user, uint8 tokenSymbol, uint256 primusFee, uint256 attestorFee)'
    ]);
    
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === PRIMUS.toLowerCase()) {
        try {
          const parsed = primusInterface.parseLog(log);
          if (parsed) {
            console.log(`\nEvent: ${parsed.name}`);
            for (const [key, value] of Object.entries(parsed.args)) {
              if (isNaN(key)) {
                console.log(`  ${key}: ${value}`);
              }
            }
          }
        } catch (e) {}
      }
    }
  }
  
  console.log('\n' + '='.repeat(70));
}

main().catch(console.error);
