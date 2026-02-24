const hre = require("hardhat");

const TX_HASH = "0x47cb4980cc22738be0c0eb14cbcbb661beed2589521038ba02bab55c05187362";
const APP = "0x47DEa24692a570F90dFAe662375Bd61c5596B7a6";
const REPUTATION_REGISTRY = "0x69ad39222bf7fc5e6A90D009E4A722cF44F93FC2";

async function main() {
  const receipt = await hre.ethers.provider.getTransactionReceipt(TX_HASH);
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('CALLBACK TRANSACTION ANALYSIS');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Status:', receipt.status === 1 ? 'SUCCESS ✅' : 'FAILED ❌');
  console.log('Gas Used:', receipt.gasUsed.toString());
  console.log('Logs Count:', receipt.logs.length);
  
  console.log('\n=== ALL LOGS ===\n');
  
  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];
    console.log('--- Log', i + 1, '---');
    console.log('Address:', log.address);
    console.log('Topics:', log.topics);
    console.log('Data:', log.data.slice(0, 100) + '...');
    
    // Try to parse with App interface
    const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
    try {
      const parsed = App.interface.parseLog({ topics: log.topics, data: log.data });
      console.log('✅ App Event:', parsed.name);
      console.log('   Args:', JSON.stringify(parsed.args, (k, v) => v && v._isBigNumber ? v.toString() : v));
    } catch (e) {}
    
    // Try to parse with ReputationRegistry interface
    const ReputationRegistry = await hre.ethers.getContractFactory("ReputationRegistry");
    try {
      const parsed = ReputationRegistry.interface.parseLog({ topics: log.topics, data: log.data });
      console.log('✅ ReputationRegistry Event:', parsed.name);
      console.log('   Args:', JSON.stringify(parsed.args, (k, v) => v && v._isBigNumber ? v.toString() : v));
    } catch (e) {}
  }
}

main().catch(console.error);
