const hre = require("hardhat");

const TX_HASH = "0x65b0429ba621f1711d99526dad6217b7b486e0e993a274ab7fb6c631e220c700";
const APP = "0xC34E7059e1E891a4c42F9232D0162dCab92Fa0ec";

async function main() {
  const receipt = await hre.ethers.provider.getTransactionReceipt(TX_HASH);
  
  console.log('════════════════════════════════════════════════════════════════');
  console.log('           MOLTBOOK CALLBACK TRANSACTION STATUS                ');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Tx Hash:', TX_HASH);
  console.log('Status:', receipt.status === 1 ? 'SUCCESS ✅' : 'FAILED ❌');
  console.log('Block:', receipt.blockNumber);
  console.log('Gas Used:', receipt.gasUsed.toString());
  console.log('');
  
  if (receipt.status === 1) {
    console.log('📊 Parsing Events...');
    console.log('');
    
    const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
    const app = App.attach(APP);
    
    for (const log of receipt.logs) {
      try {
        const parsed = app.interface.parseLog({ topics: log.topics, data: log.data });
        
        if (parsed.name === 'CheckPassed') {
          console.log('   ✅ CheckPassed Event:');
          console.log('      • Rule ID:', parsed.args.ruleId.toString());
          console.log('      • Check ID:', parsed.args.checkId.toString());
          console.log('      • Score:', parsed.args.score.toString());
          console.log('');
        }
        
        if (parsed.name === 'ValidationCompleted') {
          console.log('   ✅ ValidationCompleted Event:');
          console.log('      • Normalized Score:', parsed.args.score.toString(), '/ 100');
          console.log('');
        }
      } catch (e) {}
    }
    
    console.log('════════════════════════════════════════════════════════════════');
    console.log('                    ✅ TEST COMPLETE!                          ');
    console.log('════════════════════════════════════════════════════════════════');
  }
}

main().catch(console.error);
