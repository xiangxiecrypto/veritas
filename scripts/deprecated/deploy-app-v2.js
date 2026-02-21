/**
 * Deploy PrimusVeritasAppV2 with correct rules
 * 
 * Usage: PRIVATE_KEY=0x... node scripts/deploy-app-v2.js
 */

const { ethers } = require('ethers');

// Base Sepolia contract addresses
const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
const VALIDATION_REGISTRY = '0xF18C120B0cc018c0862eDaE6B89AB2485FD35EE3';  // V2
const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713';
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';

// Rules configuration (dataKey must match SDK responseResolves keyName)
const RULES = [
  {
    url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
    dataKey: 'btcPrice',  // MUST match SDK: keyName: "btcPrice"
    score: 100,
    decimals: 2,
    maxAge: 3600,  // 1 hour
    description: 'BTC/USD price from Coinbase'
  },
  {
    url: 'https://api.coinbase.com/v2/exchange-rates?currency=ETH',
    dataKey: 'ethPrice',
    score: 95,
    decimals: 2,
    maxAge: 7200,  // 2 hours
    description: 'ETH/USD price from Coinbase'
  }
];

async function main() {
  console.log('='.repeat(60));
  console.log('Deploying PrimusVeritasAppV2');
  console.log('='.repeat(60) + '\n');

  // Setup provider and wallet
  const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('ERROR: PRIVATE_KEY environment variable required');
    process.exit(1);
  }
  
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`Deployer: ${wallet.address}\n`);

  // Load contract artifact
  const { abi, bytecode } = require('../artifacts/contracts/PrimusVeritasAppV2.sol/PrimusVeritasAppV2.json');
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  // Deploy
  console.log('Deploying contract...');
  const contract = await factory.deploy(
    PRIMUS_TASK,
    VALIDATION_REGISTRY,
    REPUTATION_REGISTRY,
    IDENTITY_REGISTRY,
    { gasLimit: 3000000 }
  );

  console.log(`Tx: ${contract.deployTransaction.hash}`);
  await contract.deployed();
  console.log(`\n✅ PrimusVeritasAppV2: ${contract.address}\n`);

  // Add rules
  console.log('Adding verification rules...\n');
  
  for (let i = 0; i < RULES.length; i++) {
    const rule = RULES[i];
    console.log(`Rule ${i}: ${rule.description}`);
    console.log(`  URL: ${rule.url}`);
    console.log(`  dataKey: ${rule.dataKey}`);
    
    const tx = await contract.addRule(
      rule.url,
      rule.dataKey,
      rule.score,
      rule.decimals,
      rule.maxAge,
      rule.description,
      { gasLimit: 200000 }
    );
    await tx.wait();
    console.log(`  ✅ Added\n`);
  }

  // Summary
  console.log('='.repeat(60));
  console.log('DEPLOYMENT COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nPrimusVeritasAppV2: ${contract.address}`);
  console.log(`Network: Base Sepolia (84532)`);
  console.log(`Explorer: https://sepolia.basescan.org/address/${contract.address}`);
  console.log(`\nRules: ${RULES.length}`);
  
  console.log('\n---');
  console.log('Environment variables for SDK:');
  console.log(`PRIMUS_VERITAS_APP=${contract.address}`);
}

main().catch(console.error);
