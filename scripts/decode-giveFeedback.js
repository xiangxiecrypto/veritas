const hre = require("hardhat");

async function main() {
  const txHash = "0xd3021698f1937d3beb86ddaf526171a93ad30a5477159e6ab9ee84732ae305f4";
  const tx = await hre.ethers.provider.getTransaction(txHash);
  
  if (!tx) {
    console.log('Transaction not found');
    return;
  }
  
  // Try the simplified signature
  const sig = "giveFeedback(uint256,uint256,string,string,string,string)";
  const iface = new hre.ethers.utils.Interface([`function ${sig}`]);
  
  console.log('Selector from tx:', tx.data.slice(0, 10));
  console.log('Expected selector:', iface.getSighash('giveFeedback'));
  
  try {
    const decoded = iface.decodeFunctionData('giveFeedback', tx.data);
    console.log('\n✅ DECODED SUCCESSFULLY!\n');
    console.log('Function:', sig);
    console.log('Parameters:');
    console.log('  agentId:', decoded[0].toString());
    console.log('  value:', decoded[1].toString());
    console.log('  tag1:', decoded[2]);
    console.log('  tag2:', decoded[3]);
    console.log('  endpoint:', decoded[4]);
    console.log('  feedbackURI:', decoded[5]);
  } catch (e) {
    console.log('❌ Decode failed:', e.message);
  }
}

main().catch(console.error);
