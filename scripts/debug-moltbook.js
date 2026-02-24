const hre = require("hardhat");

async function main() {
  const txHash = "0x7efc4ac80ac5c478cda3807a302b34bd5ae4c4d91a4c94fd9a3505befb1347ce";
  
  const tx = await hre.ethers.provider.getTransaction(txHash);
  const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
  
  console.log('=== TRANSACTION DETAILS ===');
  console.log('From (Attestor):', tx.from);
  console.log('To:', tx.to);
  console.log('Gas Used:', receipt.gasUsed.toString());
  console.log('Status:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
  
  // Try to simulate the call
  console.log('\n=== SIMULATING CALL ===');
  try {
    const result = await hre.ethers.provider.call({
      to: tx.to,
      data: tx.data,
      from: tx.from
    }, tx.blockNumber - 1);
    console.log('Result:', result);
  } catch (e) {
    console.log('Error:', e.reason || e.message);
    
    if (e.data && e.data.includes('0x08c379a0')) {
      const errorUtf8 = hre.ethers.utils.toUtf8String('0x' + e.data.slice(138));
      console.log('\n🔴 Error Message:', errorUtf8);
    }
  }
  
  // Parse logs
  console.log('\n=== LOGS ===');
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach("0xaE7F684251dfA767e2Ed05AD3D4768B3E2935f4e");
  
  for (const log of receipt.logs) {
    try {
      const parsed = app.interface.parseLog({ topics: log.topics, data: log.data });
      console.log('Event:', parsed.name);
      console.log(JSON.stringify(parsed.args, (key, value) => {
        if (value && value._isBigNumber) return value.toString();
        return value;
      }, 2));
      console.log('---');
    } catch (e) {}
  }
}

main().catch(console.error);
