const hre = require("hardhat");

const TX_HASH = "0x65d98a66064d478d5640190ab903c7bdc966b302507a891b55204b91d9988cd4";
const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";

async function main() {
  const [wallet] = await ethers.getSigners();
  
  console.log('════════════════════════════════════════════════════════════════');
  console.log('        INTERNAL TRANSACTION ANALYSIS - giveFeedback CALL      ');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Transaction Hash:', TX_HASH);
  console.log('ReputationRegistry:', REPUTATION_REGISTRY);
  console.log('');
  
  // Get transaction receipt
  const receipt = await ethers.provider.getTransactionReceipt(TX_HASH);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TRANSACTION DETAILS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('From:', receipt.from);
  console.log('To:', receipt.to);
  console.log('Status:', receipt.status === 1 ? 'SUCCESS ✅' : 'FAILED ❌');
  console.log('Gas Used:', receipt.gasUsed.toString());
  console.log('Block:', receipt.blockNumber);
  console.log('');
  
  // Analyze logs
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('EVENT LOGS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Total logs:', receipt.logs.length);
  console.log('');
  
  // Check for ReputationRegistry events
  const repRegistryInterface = new ethers.utils.Interface([
    "event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)"
  ]);
  
  let foundFeedbackEvent = false;
  
  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];
    
    console.log(`Log ${i}:`);
    console.log('  Address:', log.address);
    console.log('  Is ReputationRegistry?', log.address.toLowerCase() === REPUTATION_REGISTRY.toLowerCase() ? '✅ YES' : '❌ NO');
    
    if (log.address.toLowerCase() === REPUTATION_REGISTRY.toLowerCase()) {
      console.log('  🎯 Found ReputationRegistry log!');
      
      try {
        const parsed = repRegistryInterface.parseLog({ topics: log.topics, data: log.data });
        
        if (parsed.name === 'NewFeedback') {
          foundFeedbackEvent = true;
          console.log('');
          console.log('  ═════════════════════════════════════════');
          console.log('  ✅ NewFeedback Event Found!');
          console.log('  ═════════════════════════════════════════');
          console.log('  • agentId:', parsed.args.agentId.toString());
          console.log('  • clientAddress:', parsed.args.clientAddress);
          console.log('  • feedbackIndex:', parsed.args.feedbackIndex.toString());
          console.log('  • value:', parsed.args.value.toString());
          console.log('  • valueDecimals:', parsed.args.valueDecimals.toString());
          console.log('  • tag1:', parsed.args.tag1);
          console.log('  • tag2:', parsed.args.tag2);
          console.log('  • endpoint:', parsed.args.endpoint);
          console.log('  • feedbackURI:', parsed.args.feedbackURI);
          console.log('  • feedbackHash:', parsed.args.feedbackHash);
          console.log('  ═════════════════════════════════════════');
          console.log('');
        }
      } catch (e) {
        console.log('  ⚠️ Could not parse as NewFeedback event');
        console.log('  Topics:', log.topics);
        console.log('  Data (first 200 chars):', log.data.slice(0, 200));
      }
    }
    console.log('');
  }
  
  // Try to get trace using debug_traceTransaction
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('INTERNAL CALLS (via debug_traceTransaction)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  try {
    const trace = await ethers.provider.send('debug_traceTransaction', [TX_HASH, {tracer: 'callTracer'}]);
    
    console.log('✅ Trace available!');
    console.log('');
    
    function printCall(call, depth = 0) {
      const indent = '  '.repeat(depth);
      const arrow = depth > 0 ? '→ ' : '';
      
      console.log(`${indent}${arrow}Type: ${call.type}`);
      console.log(`${indent}  From: ${call.from}`);
      console.log(`${indent}  To: ${call.to}`);
      console.log(`${indent}  Value: ${ethers.BigNumber.from(call.value || '0x0').toString()}`);
      console.log(`${indent}  Gas: ${call.gas}`);
      console.log(`${indent}  GasUsed: ${call.gasUsed}`);
      
      // Check if this is a call to ReputationRegistry
      if (call.to && call.to.toLowerCase() === REPUTATION_REGISTRY.toLowerCase()) {
        console.log(`${indent}  🎯 *** ReputationRegistry CALLED! ***`);
        
        // Try to decode the input
        if (call.input && call.input.length > 10) {
          const selector = call.input.slice(0, 10);
          console.log(`${indent}  Function selector: ${selector}`);
          
          // Check if it's giveFeedback
          const giveFeedbackSelector = '0x1bae8c36';
          if (selector === giveFeedbackSelector) {
            console.log(`${indent}  ✅ Function: giveFeedback()`);
            
            // Decode parameters
            try {
              const iface = new ethers.utils.Interface([
                "function giveFeedback(uint256 agentId, uint8 value, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)"
              ]);
              const decoded = iface.decodeFunctionData('giveFeedback', call.input);
              
              console.log(`${indent}  ═════════════════════════════════════════`);
              console.log(`${indent}  Parameters:`);
              console.log(`${indent}  • agentId: ${decoded[0].toString()}`);
              console.log(`${indent}  • value: ${decoded[1].toString()}`);
              console.log(`${indent}  • tag1: "${decoded[2]}"`);
              console.log(`${indent}  • tag2: "${decoded[3]}"`);
              console.log(`${indent}  • endpoint: "${decoded[4]}"`);
              console.log(`${indent}  • feedbackURI: "${decoded[5]}"`);
              console.log(`${indent}  • feedbackHash: ${decoded[6]}`);
              console.log(`${indent}  ═════════════════════════════════════════`);
            } catch (e) {
              console.log(`${indent}  ⚠️ Could not decode parameters`);
            }
          }
        }
      }
      
      console.log('');
      
      // Recursively print nested calls
      if (call.calls) {
        for (const nestedCall of call.calls) {
          printCall(nestedCall, depth + 1);
        }
      }
    }
    
    printCall(trace);
    
  } catch (e) {
    console.log('⚠️ debug_traceTransaction not available');
    console.log('Error:', e.message);
    console.log('');
    console.log('Alternative: Check on block explorer for internal transactions:');
    console.log(`https://sepolia.basescan.org/tx/${TX_HASH}#internal`);
  }
  
  // Final summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  if (foundFeedbackEvent) {
    console.log('✅ ReputationRegistry.giveFeedback() was called successfully!');
    console.log('   Evidence: NewFeedback event found in logs');
  } else {
    console.log('⚠️ No NewFeedback event found');
    console.log('   This might mean:');
    console.log('   1. The call failed (reverted)');
    console.log('   2. The event was not emitted');
    console.log('   3. The call was not made');
  }
  
  console.log('');
  console.log('Block Explorer Link:');
  console.log(`https://sepolia.basescan.org/tx/${TX_HASH}#internal`);
  console.log('');
  console.log('════════════════════════════════════════════════════════════════');
}

main().catch(console.error);
