const hre = require("hardhat");

async function main() {
  const txHash = "0xd3021698f1937d3beb86ddaf526171a93ad30a5477159e6ab9ee84732ae305f4";
  
  const tx = await hre.ethers.provider.getTransaction(txHash);
  const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
  
  console.log('=== TRANSACTION DETAILS ===\n');
  console.log('From:', tx.from);
  console.log('To:', tx.to);
  console.log('Input Data:', tx.data);
  console.log('\nStatus:', receipt.status === 1 ? 'Success' : 'Failed');
  console.log('Gas Used:', receipt.gasUsed.toString());
  
  // Extract function selector
  const selector = tx.data.slice(0, 10);
  console.log('\nFunction Selector:', selector);
  
  // Try to decode with common functions
  const functions = [
    "giveFeedback(uint256,int128,uint8,string,string,string,string,bytes32)",
    "giveFeedback(uint256,uint8)",
    "giveFeedback(uint256,uint256)",
    "feedback(uint256,uint8)",
  ];
  
  for (const sig of functions) {
    const iface = new hre.ethers.utils.Interface([`function ${sig}`]);
    const expectedSelector = iface.getSighash(sig.split('(')[0]);
    
    console.log('\nTrying:', sig);
    console.log('Expected selector:', expectedSelector);
    console.log('Match:', selector === expectedSelector ? '✅ YES!' : '❌');
    
    if (selector === expectedSelector) {
      try {
        const decoded = iface.decodeFunctionData(sig.split('(')[0], tx.data);
        console.log('\n✅ DECODED:');
        console.log(JSON.stringify(decoded, (key, value) => {
          if (value && value._isBigNumber) return value.toString();
          if (typeof value === 'object' && value !== null) {
            return Object.fromEntries(
              Object.entries(value).filter(([k]) => !isNaN(k))
            );
          }
          return value;
        }, 2));
      } catch (e) {
        console.log('Decode error:', e.message);
      }
    }
  }
}

main().catch(console.error);
