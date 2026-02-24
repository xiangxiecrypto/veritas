const hre = require("hardhat");
const { ethers } = hre;

const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";

async function main() {
  const [wallet] = await ethers.getSigners();
  
  const code = await ethers.provider.getCode(REPUTATION_REGISTRY);
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('REPUTATION REGISTRY CODE ANALYSIS');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Address:', REPUTATION_REGISTRY);
  console.log('Code length:', (code.length - 2) / 2, 'bytes');
  console.log('');
  
  // Check if it's a proxy (EIP-1167 minimal proxy pattern)
  if (code.startsWith('0x3d602d80600a3d3981f3363d3d373d3d3d363d73')) {
    console.log('✅ This is an EIP-1167 Minimal Proxy');
  } else if (code.includes('363d3d373d3d3d363d')) {
    console.log('✅ This looks like a proxy pattern');
  } else {
    console.log('❓ Not a standard proxy pattern');
  }
  
  // Try different function signatures
  console.log('\n--- Testing Function Signatures ---');
  
  const testFunctions = [
    { sig: 'giveFeedback(uint256,uint8)', selector: '0x6898c4ae' },
    { sig: 'giveFeedback(uint256,uint256)', selector: '0x705f1e85' },
    { sig: 'feedback(uint256,uint8)', selector: '0x...' },
    { sig: 'getReputation(uint256)', selector: '0x...' },
  ];
  
  for (const func of testFunctions) {
    const exists = code.includes(func.selector.replace('0x', ''));
    console.log(func.sig + ':', exists ? '✅ Found' : '❌ Not found');
  }
  
  // Try calling with different interfaces
  console.log('\n--- Trying Different Interfaces ---');
  
  const interfaces = [
    ['function giveFeedback(uint256 agentId, uint8 value) external'],
    ['function giveFeedback(uint256 agentId, uint256 value) external'],
    ['function feedback(uint256 agentId, uint8 value) external'],
  ];
  
  for (const abi of interfaces) {
    try {
      const contract = new ethers.Contract(REPUTATION_REGISTRY, abi, wallet);
      const funcFragment = contract.interface.getFunction(abi[0].split(' ')[1].split('(')[0]);
      const selector = funcFragment.format();
      console.log('\nTrying:', abi[0]);
      console.log('Selector:', contract.interface.getSighash(funcFragment));
      
      // Try static call to see if it reverts
      const callData = contract.interface.encodeFunctionData(funcFragment.name, [1018, 100]);
      const result = await ethers.provider.call({
        to: REPUTATION_REGISTRY,
        data: callData
      });
      console.log('Result:', result);
    } catch (e) {
      console.log('Error:', e.reason || e.message.slice(0, 100));
    }
  }
}

main().catch(console.error);
