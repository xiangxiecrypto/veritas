const hre = require("hardhat");

const APP = "0x09Ac6476C745271599E0BB55Ef9C9570Ac15f899";
const SIMPLE_CHECK = "0x740e869df1e487058Dc584e8e28352b4e31eAf5d";
const KARMA_CHECK = "0xE8918D03ce173d362605Ad4A97BcC495b9590EC4";

async function main() {
  const [wallet] = await ethers.getSigners();
  console.log('═══════════════════════════════════════════════════════');
  console.log('ADDING CHECKS WITH CORRECT SCORES');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Deployer:', wallet.address);
  console.log('App:', APP);
  console.log('');
  
  const gasPrice = await ethers.provider.getGasPrice();
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Add SimpleVerificationCheck with score 90 to BTC Rule (Rule 0)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ADDING BTC CHECK (Score: 90)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const btcCheckTx = await app.addCheck(0, SIMPLE_CHECK, "0x", 90, {
    gasPrice: gasPrice.mul(3),
    gasLimit: 500000
  });
  await btcCheckTx.wait();
  
  console.log('\n✅ BTC Check added (Check ID: 1, Score: 90)');
  console.log('   Tx:', btcCheckTx.hash);
  
  // Add MoltbookKarmaCheck with score 98 to Moltbook Rule (Rule 1)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ADDING MOLTBOOK CHECK (Score: 98)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const karmaCheckTx = await app.addCheck(1, KARMA_CHECK, "0x", 98, {
    gasPrice: gasPrice.mul(3),
    gasLimit: 500000
  });
  await karmaCheckTx.wait();
  
  console.log('\n✅ Moltbook Check added (Check ID: 1, Score: 98)');
  console.log('   Tx:', karmaCheckTx.hash);
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ COMPLETE!');
  console.log('═══════════════════════════════════════════════════════');
  
  console.log('\n📋 Updated Checks:');
  console.log('   BTC Rule (0):');
  console.log('     - Check 0: SimpleVerificationCheck (Score: 100) ← Old');
  console.log('     - Check 1: SimpleVerificationCheck (Score: 90) ✅ New');
  console.log('   Moltbook Rule (1):');
  console.log('     - Check 0: MoltbookKarmaCheck (Score: 100) ← Old');
  console.log('     - Check 1: MoltbookKarmaCheck (Score: 98) ✅ New');
}

main().catch(console.error);
