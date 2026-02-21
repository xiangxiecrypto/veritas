/**
 * V4 DESIGN WORKFLOW ANALYSIS
 * 
 * Let's understand the exact V4 design and what's needed:
 * 
 * 1. requestValidation() requires:
 *    - caller owns Identity NFT (agentId)
 *    - correct fee payment
 *    - active rule and checks
 * 
 * 2. PrimusTask.submitTask():
 *    - called by App
 *    - returns taskId
 * 
 * 3. Primus callback:
 *    - calls reportTaskResultCallback()
 *    - onlyPrimus modifier
 * 
 * 4. Check validation:
 *    - ICustomCheck.validate()
 *    - score calculation
 *    - registry storage
 */

const { ethers } = require("ethers");

const APP_ADDRESS = '0x8C2185d3C7D4458Eb379E67eaBff056A8D4E1aeB';
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';

const RPC_URL = 'https://sepolia.base.org';
const EXPLORER = 'https://sepolia.basescan.org';

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error('ERROR: PRIVATE_KEY not set');
    process.exit(1);
  }

  console.log('\n');
  console.log('╔═════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║         V4 DESIGN ANALYSIS                                                          ║');
  console.log('╚═════════════════════════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(pk, provider);

  // ==========================================================================
  // ANALYZE V4 DESIGN REQUIREMENTS
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('V4 DESIGN REQUIREMENTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('The V4 design requires these components to be connected:');
  console.log('');
  console.log('1. Identity Registry (ERC-721):');
  console.log('   - Issues Identity NFTs (agentIds)');
  console.log('   - User must own an agentId to request validation');
  console.log('   Address:', IDENTITY_REGISTRY);
  console.log('');
  console.log('2. Primus Task Contract:');
  console.log('   - Handles attestation requests');
  console.log('   - Coordinates attestors');
  console.log('   - Calls back to App');
  console.log('   Address:', PRIMUS_TASK);
  console.log('');
  console.log('3. PrimusVeritasAppV4:');
  console.log('   - Manages rules and checks');
  console.log('   - Receives callback from Primus');
  console.log('   Address:', APP_ADDRESS);
  console.log('');

  // ==========================================================================
  // CHECK IDENTITY REGISTRY
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CHECK IDENTITY REGISTRY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const ERC721ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function name() view returns (string)',
    'function symbol() view returns (string)'
  ];
  const identityNFT = new ethers.Contract(IDENTITY_REGISTRY, ERC721ABI, provider);

  try {
    const name = await identityNFT.name();
    const symbol = await identityNFT.symbol();
    const balance = await identityNFT.balanceOf(wallet.address);
    
    console.log('Name:', name);
    console.log('Symbol:', symbol);
    console.log('Wallet Balance:', balance.toString());
    console.log('');

    // Try to find tokens owned by wallet by checking a larger range
    console.log('Searching for token IDs owned by wallet...');
    let foundTokens = [];
    
    // Check first 500 tokens
    for (let i = 1; i <= 500 && foundTokens.length < 5; i++) {
      try {
        const owner = await identityNFT.ownerOf(i);
        if (owner.toLowerCase() === wallet.address.toLowerCase()) {
          foundTokens.push(i);
          console.log('  Found agentId:', i);
        }
      } catch (e) {
        // Token doesn't exist
      }
    }
    
    if (foundTokens.length === 0) {
      console.log('  No tokens found in range 1-500');
      console.log('');
      console.log('Note: balanceOf shows', balance.toString(), 'but we cannot find the token IDs.');
      console.log('This might be because:');
      console.log('  - Token IDs are larger than 500');
      console.log('  - The contract uses a non-standard ERC-721 implementation');
    }
    console.log('');

  } catch (e) {
    console.log('Error reading Identity Registry:', e.message);
    console.log('');
  }

  // ==========================================================================
  // CHECK PRIMUS TASK CONTRACT
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CHECK PRIMUS TASK CONTRACT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const primusCode = await provider.getCode(PRIMUS_TASK);
  console.log('Primus Task Contract:', PRIMUS_TASK);
  console.log('Code Size:', primusCode.length, 'bytes');
  console.log('Deployed:', primusCode.length > 2 ? 'YES' : 'NO');
  console.log('');

  // ==========================================================================
  // V4 WORKFLOW SUMMARY
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('V4 WORKFLOW SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('The V4 design workflow is:');
  console.log('');
  console.log('  ┌───────────────────────────────────────────────────────────────────────────────┐');
  console.log('  │ 1. USER CALLS requestValidation(agentId, ruleId, checkIds)                   │');
  console.log('  │    - Must own Identity NFT (agentId)                                          │');
  console.log('  │    - Pays fee to Primus                                                       │');
  console.log('  └───────────────────────────────────────────────────────────────────────────────┘');
  console.log('                                     ↓');
  console.log('  ┌───────────────────────────────────────────────────────────────────────────────┐');
  console.log('  │ 2. APP CALLS primusTask.submitTask()                                         │');
  console.log('  │    - Returns taskId                                                           │');
  console.log('  │    - Registers callback                                                       │');
  console.log('  └───────────────────────────────────────────────────────────────────────────────┘');
  console.log('                                     ↓');
  console.log('  ┌───────────────────────────────────────────────────────────────────────────────┐');
  console.log('  │ 3. PRIMUS PERFORMS zkTLS ATTESTATION                                         │');
  console.log('  │    - Fetches data from API                                                    │');
  console.log('  │    - Creates cryptographic proof                                              │');
  console.log('  └───────────────────────────────────────────────────────────────────────────────┘');
  console.log('                                     ↓');
  console.log('  ┌───────────────────────────────────────────────────────────────────────────────┐');
  console.log('  │ 4. PRIMUS CALLS reportTaskResultCallback(taskId, taskResult, success)        │');
  console.log('  │    - Only callable by Primus                                                  │');
  console.log('  │    - App validates attestation                                                │');
  console.log('  └───────────────────────────────────────────────────────────────────────────────┘');
  console.log('                                     ↓');
  console.log('  ┌───────────────────────────────────────────────────────────────────────────────┐');
  console.log('  │ 5. APP RUNS CHECKS                                                           │');
  console.log('  │    - For each check: ICustomCheck.validate()                                  │');
  console.log('  │    - Calculate total score                                                    │');
  console.log('  └───────────────────────────────────────────────────────────────────────────────┘');
  console.log('                                     ↓');
  console.log('  ┌───────────────────────────────────────────────────────────────────────────────┐');
  console.log('  │ 6. REGISTRY STORES RESULT                                                    │');
  console.log('  │    - validationResponse() called                                              │');
  console.log('  │    - Results immutable on-chain                                               │');
  console.log('  └───────────────────────────────────────────────────────────────────────────────┘');
  console.log('');

  // ==========================================================================
  // WHAT WE'VE TESTED
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('WHAT WE HAVE VERIFIED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('✅ App Contract: Deployed and configured');
  console.log('   - 2 rules (BTC, ETH)');
  console.log('   - 5 checks configured');
  console.log('');
  console.log('✅ Registry Contract: Deployed');
  console.log('');
  console.log('✅ Check Contracts: Working');
  console.log('   - PriceRangeCheckV2 validates correctly');
  console.log('   - ThresholdCheckV2 validates correctly');
  console.log('');
  console.log('✅ Primus SDK: Works for creating attestations');
  console.log('   - Can fetch data via zkTLS');
  console.log('   - Creates on-chain attestation');
  console.log('');
  console.log('⚠️  Identity NFT: Balance shows 24 but cannot find token IDs');
  console.log('');
  console.log('⚠️  Primus Task: Contract deployed but callback flow not tested');
  console.log('');

  console.log('╔═════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║     V4 Design: Components Verified, Full Callback Flow Requires Identity NFT        ║');
  console.log('╚═════════════════════════════════════════════════════════════════════════════════════╝');
  console.log('');
}

main().catch(console.error);
