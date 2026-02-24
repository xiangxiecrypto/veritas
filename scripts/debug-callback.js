const hre = require("hardhat");

const TX_HASH = "0xdd639aa5492ff557d20be6d818868a071fd24c9e7543cef1c62d5b16243b7a57";
const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";
const APP = "0x27EbbE4ddFBef4563570DB0FF60Bb16635568f1E";

async function main() {
  const tx = await hre.ethers.provider.getTransaction(TX_HASH);
  const receipt = await hre.ethers.provider.getTransactionReceipt(TX_HASH);
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('DEBUG: CALLBACK TRANSACTION');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Status:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
  console.log('Gas Used:', receipt.gasUsed.toString());
  console.log('Logs:', receipt.logs.length);
  
  // Try to simulate the call to see the error
  console.log('\n--- Simulating callback call ---');
  try {
    const result = await hre.ethers.provider.call({
      to: tx.to,
      data: tx.data,
      from: tx.from
    }, tx.blockNumber - 1);
    console.log('Result:', result);
  } catch (e) {
    console.log('Error:', e.reason || e.message.slice(0, 200));
    
    if (e.data) {
      // Try to decode the error
      try {
        const errorUtf8 = hre.ethers.utils.toUtf8String('0x' + e.data.slice(138));
        console.log('Error message:', errorUtf8);
      } catch (e2) {
        console.log('Could not decode error');
      }
    }
  }
  
  // Check if it's calling the right contract
  console.log('\n--- Transaction Details ---');
  console.log('To:', tx.to);
  console.log('From:', tx.from);
  console.log('Data length:', tx.data.length);
  
  // Check the reputation registry
  console.log('\n--- Checking ReputationRegistry ---');
  const code = await hre.ethers.provider.getCode(REPUTATION_REGISTRY);
  console.log('Code length:', (code.length - 2) / 2, 'bytes');
  
  // Try to call getReputation
  const reputation = new ethers.Contract(
    REPUTATION_REGISTRY,
    ["function getReputation(uint256 agentId) view returns (uint256)"],
    tx.from
  );
  
  try {
    const rep = await reputation.getReputation(1018);
    console.log('Reputation for 1018:', rep.toString());
  } catch (e) {
    console.log('getReputation failed:', e.reason || e.message.slice(0, 200));
    
    // Check what functions exist
    if (e.message.includes('revert')) {
      console.log('\n--- This means the getReputation function might not exist or is reverting ---');
    }
  }
}

main().catch(console.error);
