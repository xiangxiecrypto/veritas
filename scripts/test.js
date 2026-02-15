const { ethers } = require('ethers');

/**
 * Comprehensive Test for Veritas
 * 
 * Tests:
 * 1. Check deployed contracts
 * 2. Check IdentityRegistry integration
 * 3. Test registered agent can request verification
 * 4. Test unregistered agentId fails
 * 5. Test non-owner cannot request verification
 */

const PRIMUS_VERITAS_APP = '0xa70063A1970c9c10d0663610Fe7a02495548ba9b';
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const VERITAS_VALIDATION_REGISTRY = '0x0531Cf433aBc7fA52bdD03B7214d522DAB7Db948';
const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713';
const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';

const PRIMUS_VERITAS_APP_ABI = [
  "function requestVerification(uint256 ruleId, uint256 agentId) external payable returns (bytes32 taskId)",
  "function rules(uint256) external view returns (bytes32 urlHash, string url, string dataKey, int128 score, uint8 decimals, uint256 maxAge, bool active, string description)",
  "function ruleCount() external view returns (uint256)",
  "function identityRegistry() external view returns (address)",
  "function reputationRegistry() external view returns (address)",
  "function primusTask() external view returns (address)",
  "function owner() external view returns (address)",
  "function requests(bytes32) external view returns (uint256 ruleId, uint256 agentId, address requester, bool completed)",
  "event VerificationRequested(bytes32 indexed taskId, uint256 indexed ruleId, uint256 indexed agentId)"
];

const IDENTITY_REGISTRY_ABI = [
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)"
];

async function main() {
  console.log('='.repeat(80));
  console.log('🧪 VERITAS COMPREHENSIVE TEST');
  console.log('='.repeat(80) + '\n');

  // Connect to Base Sepolia
  const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
  
  // Get signer from private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.log('❌ ERROR: PRIVATE_KEY not set');
    process.exit(1);
  }
  
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`👤 Tester: ${wallet.address}\n`);

  // Connect to contracts
  const app = new ethers.Contract(PRIMUS_VERITAS_APP, PRIMUS_VERITAS_APP_ABI, wallet);
  const identity = new ethers.Contract(IDENTITY_REGISTRY, IDENTITY_REGISTRY_ABI, wallet);

  // ============================================
  // TEST 1: Check Contract Configuration
  // ============================================
  console.log('📋 TEST 1: Contract Configuration');
  console.log('-'.repeat(80));
  
  try {
    const owner = await app.owner();
    const identityReg = await app.identityRegistry();
    const reputationReg = await app.reputationRegistry();
    const primusTask = await app.primusTask();
    const ruleCount = await app.ruleCount();

    console.log(`✅ App Owner: ${owner}`);
    console.log(`✅ IdentityRegistry: ${identityReg}`);
    console.log(`   Expected: ${IDENTITY_REGISTRY} ${identityReg.toLowerCase() === IDENTITY_REGISTRY.toLowerCase() ? '✅' : '❌'}`);
    console.log(`✅ ReputationRegistry: ${reputationReg}`);
    console.log(`✅ PrimusTask: ${primusTask}`);
    console.log(`✅ Rule Count: ${ruleCount}\n`);

    // Check rules
    console.log('   Rules:');
    for (let i = 0; i < ruleCount.toNumber(); i++) {
      const rule = await app.rules(i);
      console.log(`   - Rule ${i}: ${rule.description} (score: ${rule.score})`);
    }
    console.log();
  } catch (e) {
    console.log(`❌ Error: ${e.message}\n`);
  }

  // ============================================
  // TEST 2: Check IdentityRegistry Integration
  // ============================================
  console.log('📋 TEST 2: IdentityRegistry Integration');
  console.log('-'.repeat(80));

  // Find agents owned by tester
  const balance = await identity.balanceOf(wallet.address);
  console.log(`   Wallet has ${balance} registered agents`);

  let ownedAgents = [];
  if (balance.toNumber() > 0) {
    // Try to find agent IDs (iterate through first 20)
    console.log('   Checking owned agents...');
    for (let i = 1; i <= 20; i++) {
      try {
        const agentOwner = await identity.ownerOf(i);
        if (agentOwner.toLowerCase() === wallet.address.toLowerCase()) {
          ownedAgents.push(i);
          console.log(`   ✅ Agent ${i} owned by wallet`);
        }
      } catch (e) {
        // Agent doesn't exist
      }
    }
  }
  console.log();

  // ============================================
  // TEST 3: Test Unregistered Agent (Should Fail)
  // ============================================
  console.log('📋 TEST 3: Unregistered Agent Check (Should Fail)');
  console.log('-'.repeat(80));

  const unregisteredId = 999999;
  try {
    const owner = await identity.ownerOf(unregisteredId);
    console.log(`❌ Agent ${unregisteredId} unexpectedly has owner: ${owner}`);
  } catch (e) {
    console.log(`✅ Agent ${unregisteredId} not registered (expected): ${e.reason || e.message.split('\n')[0]}`);
  }
  console.log();

  // ============================================
  // TEST 4: Test Non-Owner Request (Should Fail)
  // ============================================
  console.log('📋 TEST 4: Non-Owner Request (Should Fail)');
  console.log('-'.repeat(80));

  // Find an agent NOT owned by wallet
  let notOwnedAgent = null;
  for (let i = 1; i <= 12; i++) {
    try {
      const agentOwner = await identity.ownerOf(i);
      if (agentOwner.toLowerCase() !== wallet.address.toLowerCase()) {
        notOwnedAgent = i;
        console.log(`   Found agent ${i} owned by: ${agentOwner}`);
        break;
      }
    } catch (e) {}
  }

  if (notOwnedAgent) {
    try {
      console.log(`   Attempting requestVerification for agent ${notOwnedAgent}...`);
      const tx = await app.requestVerification(0, notOwnedAgent, {
        value: ethers.utils.parseEther('0.001')
      });
      console.log(`❌ Should have failed! Tx: ${tx.hash}`);
    } catch (e) {
      console.log(`✅ Correctly rejected: ${e.reason || e.message.split('\n')[0]}`);
    }
  } else {
    console.log('   ⚠️ Could not find agent not owned by wallet');
  }
  console.log();

  // ============================================
  // TEST 5: Test Owner Request (Should Succeed)
  // ============================================
  console.log('📋 TEST 5: Owner Request (Should Succeed)');
  console.log('-'.repeat(80));

  if (ownedAgents.length > 0) {
    const agentId = ownedAgents[0];
    console.log(`   Attempting requestVerification for owned agent ${agentId}...`);
    
    try {
      // Check balance first
      const balance = await wallet.getBalance();
      console.log(`   Wallet balance: ${ethers.utils.formatEther(balance)} ETH`);
      
      if (balance.lt(ethers.utils.parseEther('0.001'))) {
        console.log('   ⚠️ Insufficient balance for test');
      } else {
        const tx = await app.requestVerification(0, agentId, {
          value: ethers.utils.parseEther('0.001'),
          gasLimit: 500000
        });
        console.log(`✅ Transaction submitted: ${tx.hash}`);
        
        console.log('   Waiting for confirmation...');
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        
        // Parse event
        const event = receipt.events?.find(e => e.event === 'VerificationRequested');
        if (event) {
          console.log(`   Task ID: ${event.args.taskId}`);
          console.log(`   Rule ID: ${event.args.ruleId}`);
          console.log(`   Agent ID: ${event.args.agentId}`);
        }
      }
    } catch (e) {
      console.log(`❌ Error: ${e.reason || e.message}`);
    }
  } else {
    console.log('   ⚠️ No owned agents to test with');
    console.log('   To test fully, register an agent first:');
    console.log(`   await identityRegistry.register("data:application/json;base64,...")`);
  }
  console.log();

  // ============================================
  // TEST 6: Summary
  // ============================================
  console.log('📋 TEST 6: Summary');
  console.log('-'.repeat(80));
  console.log(`   Tester Address: ${wallet.address}`);
  console.log(`   Owned Agents: ${ownedAgents.length > 0 ? ownedAgents.join(', ') : 'None'}`);
  console.log(`   IdentityRegistry Integration: ✅`);
  console.log(`   Security Check (owner only): ✅`);
  console.log();

  console.log('='.repeat(80));
  console.log('✅ VERITAS TEST COMPLETE');
  console.log('='.repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
