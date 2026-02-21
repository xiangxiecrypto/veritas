/**
 * Deploy V4 App with Real Primus Callback and Test
 * 
 * This version implements the exact Primus callback interface
 */

const { ethers } = require("ethers");
const { PrimusNetwork } = require("@primuslabs/network-core-sdk");

const CHAIN_ID = 84532;
const RPC_URL = 'https://sepolia.base.org';
const EXPLORER = 'https://sepolia.basescan.org';

const REGISTRY_ADDRESS = '0x257DC4B38066840769EeA370204AD3724ddb0836';
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const PRICE_RANGE_V2 = '0x91ce67B719fB850e6C233aCCae2c5079282c1321';
const THRESHOLD_V2 = '0x8019599933843bE5702861f784708D12A6a8535F';
const PRIMUS_ATTESTOR = '0x0DE886e31723e64Aa72e51977B14475fB66a9f72';

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error('ERROR: PRIVATE_KEY not set');
    process.exit(1);
  }

  console.log('\n');
  console.log('╔═════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║         DEPLOY V4 APP WITH REAL PRIMUS CALLBACK                                     ║');
  console.log('╚═════════════════════════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(pk, provider);

  console.log('Deployer:', wallet.address);
  console.log('Balance:', ethers.utils.formatEther(await wallet.getBalance()), 'ETH');
  console.log('');

  // Load artifacts
  const AppArtifact = require('../artifacts/contracts/PrimusVeritasAppV4Callback.sol/PrimusVeritasAppV4Callback.json');

  // ==========================================================================
  // STEP 1: Deploy App
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: DEPLOY APP');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const AppFactory = new ethers.ContractFactory(
    AppArtifact.abi,
    AppArtifact.bytecode,
    wallet
  );

  console.log('Deploying PrimusVeritasAppV4Callback...');
  const app = await AppFactory.deploy(
    REGISTRY_ADDRESS,
    IDENTITY_REGISTRY,
    ethers.constants.AddressZero
  );
  console.log('  Tx:', app.deployTransaction.hash);
  await app.deployed();
  console.log('  ✅ App:', app.address);
  console.log('  Explorer:', EXPLORER + '/address/' + app.address);
  console.log('');

  // ==========================================================================
  // STEP 2: Configure Rules
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: CONFIGURE RULES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Add BTC Rule
  console.log('Adding BTC Rule...');
  let tx = await app.addRule(
    "https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT",
    "btcPrice",  // This matches what SDK extracts
    2,
    3600,
    "BTC/USD from OKX"
  );
  console.log('  Tx:', tx.hash);
  await tx.wait();
  console.log('  ✅ BTC Rule added');
  console.log('');

  // Add PriceRangeCheck
  console.log('Adding PriceRangeCheck for BTC...');
  const btcParams = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'int128'],
    [6000000, 10000000]
  );
  tx = await app.addCheck(0, PRICE_RANGE_V2, btcParams, 100);
  console.log('  Tx:', tx.hash);
  await tx.wait();
  console.log('  ✅ Check added');
  console.log('');

  // ==========================================================================
  // STEP 3: Test with Real Primus SDK
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 3: TEST WITH REAL PRIMUS SDK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const primusNetwork = new PrimusNetwork();
  await primusNetwork.init(wallet, CHAIN_ID);
  console.log('✅ Primus SDK Initialized');
  console.log('');

  // Submit task with APP as callback address
  console.log('Submitting task...');
  const submitTaskParams = { address: app.address };
  const submitTaskResult = await primusNetwork.submitTask(submitTaskParams);
  console.log('  Task ID:', submitTaskResult.taskId);
  console.log('  Tx:', EXPLORER + '/tx/' + submitTaskResult.taskTxHash);
  console.log('');

  // Define request
  const requests = [{
    url: "https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT",
    method: "GET",
    header: {},
    body: "",
  }];

  const responseResolves = [[{
    keyName: "btcPrice",
    parseType: "json",
    parsePath: "$.data[0].last",
  }]];

  // Create attestation
  console.log('Creating attestation...');
  const attestParams = {
    ...submitTaskParams,
    ...submitTaskResult,
    requests,
    responseResolves,
  };

  const attestResult = await primusNetwork.attest(attestParams);
  console.log('');
  console.log('✅ Attestation Created');
  console.log('  Report Tx:', EXPLORER + '/tx/' + attestResult[0]?.reportTxHash);
  console.log('');

  // Wait for result
  console.log('Waiting for attestation result...');
  const verifyParams = {
    taskId: attestResult[0].taskId,
    reportTxHash: attestResult[0].reportTxHash,
  };

  const taskResult = await primusNetwork.verifyAndPollTaskResult(verifyParams);
  
  const attestation = taskResult[0]?.attestation;
  console.log('');
  console.log('✅ Attestation Received');
  console.log('  Attestor:', taskResult[0]?.attestor);
  console.log('  Recipient:', attestation?.recipient);
  console.log('  Data:', attestation?.data);
  console.log('');

  // Check if App received callback
  console.log('Checking if App received callback...');
  const completed = await app.completedValidations(attestResult[0].taskId);
  console.log('  Completed:', completed);
  console.log('');

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  console.log('Deployed Contracts:');
  console.log('  App:', app.address);
  console.log('');

  console.log('Configuration:');
  console.log('  Implements: IPrimusNetworkCallback');
  console.log('  Callback: reportTaskResultCallback()');
  console.log('  Primus Attestor:', PRIMUS_ATTESTOR);
  console.log('');

  console.log('Transaction Links:');
  console.log('  Submit Task: ' + EXPLORER + '/tx/' + submitTaskResult.taskTxHash);
  console.log('  Attestation: ' + EXPLORER + '/tx/' + attestResult[0]?.reportTxHash);
  console.log('');

  if (completed) {
    console.log('╔═════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║     REAL PRIMUS CALLBACK RECEIVED! ✅                                                ║');
    console.log('╚═════════════════════════════════════════════════════════════════════════════════════╝');
  } else {
    console.log('Note: Callback may not have been processed yet.');
    console.log('The Primus network calls reportTaskResultCallback() automatically.');
    console.log('Check the App contract events for AttestationReceived.');
  }
  console.log('');
}

main().catch(console.error);
