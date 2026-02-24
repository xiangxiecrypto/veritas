const hre = require("hardhat");

const TX_HASH = "0x29d89f9562a5fc13e1081318cc4ba46b5f04e82c89bd1c54882a81531bfb5205";

async function main() {
  const tx = await hre.ethers.provider.getTransaction(TX_HASH);
  const receipt = await hre.ethers.provider.getTransactionReceipt(TX_HASH);
  
  console.log('════════════════════════════════════════════════════════════════');
  console.log('        DEBUGGING MOLTBOOK CALLBACK FAILURE                    ');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Transaction:', TX_HASH);
  console.log('Status:', receipt.status === 0 ? 'FAILED ❌' : 'SUCCESS ✅');
  console.log('Gas Used:', receipt.gasUsed.toString());
  console.log('Logs:', receipt.logs.length);
  console.log('');
  
  // Try to simulate the call
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SIMULATING CALL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  try {
    const result = await hre.ethers.provider.call({
      to: tx.to,
      data: tx.data,
      from: tx.from
    }, tx.blockNumber - 1);
    
    console.log('Call result:', result);
    console.log('(Empty result means revert without message)');
  } catch (e) {
    console.log('Error:', e.reason || e.message);
    
    if (e.data) {
      // Try to decode error
      if (e.data.includes('0x08c379a0')) {
        const errorUtf8 = hre.ethers.utils.toUtf8String('0x' + e.data.slice(138));
        console.log('');
        console.log('🔴 Revert Reason:', errorUtf8);
      } else {
        console.log('Error data:', e.data.slice(0, 200));
      }
    }
  }
  
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('POSSIBLE CAUSES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('1. MoltbookKarmaCheck validation failed:');
  console.log('   - karma > 0 check (karma = 1, should pass)');
  console.log('   - URL mismatch');
  console.log('   - dataKey mismatch');
  console.log('   - parsePath mismatch');
  console.log('');
  console.log('2. Gas issue:');
  console.log('   - Not enough gas to complete all operations');
  console.log('');
  console.log('3. Contract logic error:');
  console.log('   - Error in _processValidation()');
  console.log('   - Error in check validation');
  console.log('');
  console.log('Block Explorer:');
  console.log('https://sepolia.basescan.org/tx/' + TX_HASH);
}

main().catch(console.error);
