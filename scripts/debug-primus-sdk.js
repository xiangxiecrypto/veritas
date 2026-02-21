/**
 * Debug Primus SDK Parameter Formats
 * 
 * Tests different parameter combinations to find what the SDK expects.
 */

const hre = require("hardhat");
const { ethers } = hre;
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

const PRIMUS_ATTESTOR = '0x0DE886e31723e64Aa72e51977B14475fB66a9f72';
const CHAIN_ID = 84532;

// Test task parameters (from a deployed task)
const TEST_TASK_ID = '8a6700cda534a6860a6d4de4253c68a2a4dc9d8e406640d1c49e1a746356afc1';
const TEST_TASK_TX = '0x2efde7548274d2b986e5f70f97661404bfc9ee700f03d51ee21d00b89a286527';

async function testFormat(name, params) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${name}`);
  console.log('='.repeat(60));
  console.log('Params:', JSON.stringify(params, null, 2));
  
  try {
    const [wallet] = await ethers.getSigners();
    const primus = new PrimusNetwork();
    await primus.init(wallet, CHAIN_ID);
    
    const result = await primus.attest(params, 30000);
    console.log('✅ SUCCESS!');
    console.log('Result:', JSON.stringify(result, null, 2));
    return true;
  } catch (e) {
    console.error('❌ FAILED:', e.message);
    return false;
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║       DEBUG PRIMUS SDK PARAMETER FORMATS                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  const [wallet] = await ethers.getSigners();
  console.log('Wallet:', wallet.address);
  console.log('');

  // Test 1: Basic format (from MEMORY.md)
  await testFormat('Basic Format (from MEMORY.md)', {
    taskId: TEST_TASK_ID,
    taskTxHash: TEST_TASK_TX,
    taskAttestors: [PRIMUS_ATTESTOR],
    requests: [{ 
      url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC', 
      method: 'GET' 
    }],
    responseResolves: [[{ 
      keyName: 'btcPrice', 
      parsePath: '$.data.rates.USD' 
    }]]
  });

  // Test 2: With headers
  await testFormat('With Headers', {
    taskId: TEST_TASK_ID,
    taskTxHash: TEST_TASK_TX,
    taskAttestors: [PRIMUS_ATTESTOR],
    requests: [{ 
      url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC', 
      method: 'GET',
      headers: {}
    }],
    responseResolves: [[{ 
      keyName: 'btcPrice', 
      parsePath: '$.data.rates.USD' 
    }]]
  });

  // Test 3: Simple URL without query params
  await testFormat('Simple URL (no query params)', {
    taskId: TEST_TASK_ID,
    taskTxHash: TEST_TASK_TX,
    taskAttestors: [PRIMUS_ATTESTOR],
    requests: [{ 
      url: 'https://api.coinbase.com/v2/exchange-rates', 
      method: 'GET' 
    }],
    responseResolves: [[{ 
      keyName: 'btcPrice', 
      parsePath: '$.data.rates.USD' 
    }]]
  });

  // Test 4: Different parse path
  await testFormat('Different Parse Path', {
    taskId: TEST_TASK_ID,
    taskTxHash: TEST_TASK_TX,
    taskAttestors: [PRIMUS_ATTESTOR],
    requests: [{ 
      url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC', 
      method: 'GET' 
    }],
    responseResolves: [[{ 
      keyName: 'btcPrice', 
      parsePath: 'data.rates.USD'  // Without $.
    }]]
  });

  // Test 5: Without responseResolves nesting
  await testFormat('Flat responseResolves', {
    taskId: TEST_TASK_ID,
    taskTxHash: TEST_TASK_TX,
    taskAttestors: [PRIMUS_ATTESTOR],
    requests: [{ 
      url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC', 
      method: 'GET' 
    }],
    responseResolves: [{ 
      keyName: 'btcPrice', 
      parsePath: '$.data.rates.USD' 
    }]
  });

  // Test 6: Checksum addresses
  const checksumAttestor = ethers.utils.getAddress(PRIMUS_ATTESTOR);
  await testFormat('Checksum Attestor Address', {
    taskId: TEST_TASK_ID,
    taskTxHash: TEST_TASK_TX,
    taskAttestors: [checksumAttestor],
    requests: [{ 
      url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC', 
      method: 'GET' 
    }],
    responseResolves: [[{ 
      keyName: 'btcPrice', 
      parsePath: '$.data.rates.USD' 
    }]]
  });

  // Test 7: With 0x prefix on taskId
  await testFormat('Task ID with 0x prefix', {
    taskId: '0x' + TEST_TASK_ID,
    taskTxHash: TEST_TASK_TX,
    taskAttestors: [PRIMUS_ATTESTOR],
    requests: [{ 
      url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC', 
      method: 'GET' 
    }],
    responseResolves: [[{ 
      keyName: 'btcPrice', 
      parsePath: '$.data.rates.USD' 
    }]]
  });

  // Test 8: Minimal params
  await testFormat('Minimal Params', {
    taskId: TEST_TASK_ID,
    taskTxHash: TEST_TASK_TX,
    taskAttestors: [PRIMUS_ATTESTOR],
    requests: [{ 
      url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC'
    }],
    responseResolves: [[{ 
      keyName: 'btcPrice'
    }]]
  });

  console.log('\n' + '='.repeat(60));
  console.log('Testing Complete');
  console.log('='.repeat(60));
}

main().catch(console.error);
