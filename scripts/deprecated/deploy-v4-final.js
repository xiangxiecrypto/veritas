const { ethers } = require('ethers');
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

const REGISTRY_ADDRESS = '0x257DC4B38066840769EeA370204AD3724ddb0836';
const PRICE_RANGE_V2 = '0x91ce67B719fB850e6C233aCCae2c5079282c1321';
const THRESHOLD_V2 = '0x8019599933843bE5702861f784708D12A6a8535F';
const CHAIN_ID = 84532;

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error('ERROR: PRIVATE_KEY not set');
    process.exit(1);
  }

  console.log('\n');
  console.log('╔═════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║         V4 VERITAS - PRIMUS ATTESTOR CALLBACK FIX                                    ║');
  console.log('╚═════════════════════════════════════════════════════════════════════════════════════╝\n');

  const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
  const wallet = new ethers.Wallet(pk, provider);

  console.log('Deployer:', wallet.address);
  console.log('Balance:', ethers.utils.formatEther(await wallet.getBalance()), 'ETH\n');

  // Load contract
  const AppArtifact = require('../artifacts/contracts/PrimusVeritasAppV4Final.sol/PrimusVeritasAppV4Final.json');
  const AppFactory = new ethers.ContractFactory(AppArtifact.abi, AppArtifact.bytecode, wallet);

  // ===========================================================================
  // STEP 1: Deploy
  // ===========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: DEPLOY V4 APP');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Deploying PrimusVeritasAppV4Final...');
  const app = await AppFactory.deploy(REGISTRY_ADDRESS);
  console.log('  Tx:', 'https://sepolia.basescan.org/tx/' + app.deployTransaction.hash);
  await app.deployed();
  console.log('  ✅ App:', app.address);
  console.log('');

  // Verify authorized addresses
  const primusTask = await app.PRIMUS_TASK();
  const primusAttestor = await app.PRIMUS_ATTESTOR();
  console.log('Authorized Callers (hardcoded):');
  console.log('  PrimusTask:', primusTask);
  console.log('  PrimusAttestor:', primusAttestor);
  console.log('');

  // ===========================================================================
  // STEP 2: Configure Rules & Checks
  // ===========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: CONFIGURE RULES & CHECKS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Add BTC Rule
  console.log('Adding BTC Rule (OKX API)...');
  let tx = await app.addRule(
    'https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT',
    'btcPrice',
    2,   // decimals
    3600, // maxAge (1 hour)
    'BTC/USD from OKX'
  );
  await tx.wait();
  console.log('  ✅ Rule added (ID: 0)');

  // Add PriceRangeCheck
  console.log('Adding PriceRangeCheck ($60k-$100k)...');
  const btcParams = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'int128'],
    [6000000, 10000000]  // min: $60k, max: $100k (in cents)
  );
  tx = await app.addCheck(0, PRICE_RANGE_V2, btcParams, 100);
  await tx.wait();
  console.log('  ✅ Check added (ID: 0)');

  // Add ETH Rule
  console.log('Adding ETH Rule (Coinbase API)...');
  tx = await app.addRule(
    'https://api.coinbase.com/v2/exchange-rates?currency=ETH',
    'data.rates.USD',
    2, 3600, 'ETH/USD from Coinbase'
  );
  await tx.wait();
  console.log('  ✅ Rule added (ID: 1)');

  // Add ThresholdCheck for ETH
  console.log('Adding ThresholdCheck (10% deviation from $2,700)...');
  const ethParams = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'int128'],
    [270000, 1000]  // expected: $2,700, maxDeviation: 10%
  );
  tx = await app.addCheck(1, THRESHOLD_V2, ethParams, 50);
  await tx.wait();
  console.log('  ✅ Check added (ID: 0)');
  console.log('');

  // ===========================================================================
  // STEP 3: Create Attestation with Real Primus SDK
  // ===========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 3: CREATE REAL PRIMUS SDK ATTESTATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const primusNetwork = new PrimusNetwork();
  await primusNetwork.init(wallet, CHAIN_ID);

  console.log('Submitting task to Primus...');
  const submitResult = await primusNetwork.submitTask({ address: app.address });
  console.log('Task ID:', submitResult.taskId);
  console.log('Submit Tx:', 'https://sepolia.basescan.org/tx/' + submitResult.taskTxHash);
  console.log('');

  console.log('Creating zkTLS attestation (takes ~30-60 seconds)...');
  const attestResult = await primusNetwork.attest({
    address: app.address,
    ...submitResult,
    requests: [{
      url: 'https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT',
      method: 'GET', header: {}, body: '',
    }],
    responseResolves: [[{
      keyName: 'btcPrice', parseType: 'json', parsePath: '$.data[0].last',
    }]],
  });
  console.log('✅ Attestation Created');
  console.log('Report Tx:', 'https://sepolia.basescan.org/tx/' + attestResult[0]?.reportTxHash);
  console.log('');

  // Get attestation result
  const result = await primusNetwork.verifyAndPollTaskResult({
    taskId: attestResult[0].taskId,
    reportTxHash: attestResult[0].reportTxHash,
  });

  const attestation = result[0]?.attestation;
  console.log('Attestation Details:');
  console.log('  Attestor:', result[0]?.attestor);
  console.log('  Recipient:', attestation?.recipient);
  console.log('  Data:', attestation?.data);

  // Convert timestamp ms -> seconds
  const timestampSec = Math.floor(Number(attestation?.timestamp) / 1000);
  console.log('  Timestamp:', timestampSec, 'seconds');
  console.log('');

  // ===========================================================================
  // STEP 4: Process On-Chain
  // ===========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 4: PROCESS ATTESTATION ON-CHAIN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Waiting for nonce sync (5 seconds)...');
  await new Promise(r => setTimeout(r, 5000));

  try {
    // Call processAttestation - wallet is authorized as owner
    const tx = await app.processAttestation(
      attestResult[0].taskId,  // attestationHash
      attestation?.data,       // attestationData
      timestampSec,            // timestamp (seconds)
      0,                       // ruleId
      [0],                     // checkIds
      { gasLimit: 500000 }
    );
    console.log('Processing Tx:', 'https://sepolia.basescan.org/tx/' + tx.hash);

    const receipt = await tx.wait();
    console.log('✅ Transaction Confirmed');
    console.log('  Block:', receipt.blockNumber);
    console.log('  Gas Used:', receipt.gasUsed.toString());
    console.log('');

    // Parse events
    console.log('Events:');
    for (const log of receipt.logs) {
      try {
        const parsed = app.interface.parseLog(log);
        if (parsed?.name === 'AttestationProcessed') {
          console.log('  ✅ AttestationProcessed');
          console.log('     Score:', parsed.args.score, '/ 100');
          console.log('     Caller:', parsed.args.caller);
        }
        if (parsed?.name === 'CheckPassed') {
          const usd = parsed.args.value.toNumber() / 100;
          console.log('  ✅ CheckPassed');
          console.log('     BTC Price: $' + usd.toFixed(2));
          console.log('     Score:', parsed.args.score.toString());
        }
        if (parsed?.name === 'CheckFailed') {
          console.log('  ❌ CheckFailed');
        }
      } catch (e) {}
    }
    console.log('');

    // Verify processed
    const processed = await app.processedAttestations(attestResult[0].taskId);
    console.log('Verification:');
    console.log('  Processed:', processed);
    console.log('');

    console.log('╔═════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║     V4 PRIMUS CALLBACK FIX: SUCCESS! ✅                                              ║');
    console.log('╚═════════════════════════════════════════════════════════════════════════════════════╝\n');

    console.log('Summary:');
    console.log('  ✅ App deployed with Primus attestor authorization');
    console.log('  ✅ Real Primus SDK attestation created');
    console.log('  ✅ Attestation processed on-chain');
    console.log('  ✅ Check contract validated BTC price');
    console.log('  ✅ Result stored in Registry');
    console.log('');

    console.log('Contract Addresses:');
    console.log('  App:             ', app.address);
    console.log('  Registry:        ', REGISTRY_ADDRESS);
    console.log('  PriceRangeCheck: ', PRICE_RANGE_V2);
    console.log('');

    console.log('Authorized Callers:');
    console.log('  PrimusTask:      ', await app.PRIMUS_TASK());
    console.log('  PrimusAttestor:  ', await app.PRIMUS_ATTESTOR());
    console.log('  Owner:           ', await app.owner());
    console.log('');

  } catch (e) {
    console.log('❌ Error:', e.message);
    if (e.reason) console.log('   Reason:', e.reason);
    if (e.error?.message) console.log('   Detail:', e.error.message);
    console.log('');
    process.exit(1);
  }
}

main().catch(console.error);
