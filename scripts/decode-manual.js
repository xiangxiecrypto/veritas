const hre = require("hardhat");

async function main() {
  const txHash = "0xd3021698f1937d3beb86ddaf526171a93ad30a5477159e6ab9ee84732ae305f4";
  const tx = await hre.ethers.provider.getTransaction(txHash);
  
  // Decode manually
  const data = tx.data;
  console.log('Full data:', data);
  console.log('\nSelector:', data.slice(0, 10));
  console.log('Params:', data.slice(10));
  
  // Try decoding as (uint256, uint256, string, string, string, string)
  const sig1 = "giveFeedback(uint256,uint256,string,string,string,string)";
  const iface1 = new hre.ethers.utils.Interface([`function ${sig1}`]);
  console.log('\nTrying:', sig1);
  console.log('Expected selector:', iface1.getSighash('giveFeedback'));
  
  try {
    const decoded = iface1.decodeFunctionData('giveFeedback', data);
    console.log('✅ Decoded:');
    console.log('  agentId:', decoded[0].toString());
    console.log('  value:', decoded[1].toString());
    console.log('  tag1:', decoded[2]);
    console.log('  tag2:', decoded[3]);
    console.log('  endpoint:', decoded[4]);
    console.log('  feedbackURI:', decoded[5]);
  } catch (e) {
    console.log('❌ Failed');
  }
}

main().catch(console.error);
