/**
 * Deploy V4 System with MockPrimusTask
 * 
 * 1. Deploy MockPrimusTask
 * 2. Deploy new PrimusVeritasAppV4 with MockPrimusTask
 * 3. Configure rules and checks
 * 4. Test the full callback flow
 */

const { ethers } = require("ethers");

const CHAIN_ID = 84532;
const RPC_URL = 'https://sepolia.base.org';
const EXPLORER = 'https://sepolia.basescan.org';

// Existing contracts to connect
const REGISTRY_ADDRESS = '0x257DC4B38066840769EeA370204AD3724ddb0836';
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const REPUTATION_REGISTRY = '0x0000000000000000000000000000000000000000'; // Not needed for testing
const PRICE_RANGE_V2 = '0x91ce67B719fB850e6C233aCCae2c5079282c1321';
const THRESHOLD_V2 = '0x8019599933843bE5702861f784708D12A6a8535F';

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error('ERROR: PRIVATE_KEY not set');
    process.exit(1);
  }

  console.log('\n');
  console.log('╔═════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║         DEPLOY V4 SYSTEM WITH MOCK PRIMUS TASK                                      ║');
  console.log('╚═════════════════════════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(pk, provider);

  console.log('Deployer:', wallet.address);
  const balance = await wallet.getBalance();
  console.log('Balance:', ethers.utils.formatEther(balance), 'ETH');
  console.log('');

  // ==========================================================================
  // STEP 1: Deploy MockPrimusTask
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: DEPLOY MOCK PRIMUS TASK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const MockPrimusTaskBytecode = require('../artifacts/contracts/MockPrimusTask.sol/MockPrimusTask.json').bytecode;
  const MockPrimusTaskABI = require('../artifacts/contracts/MockPrimusTask.sol/MockPrimusTask.json').abi;

  const MockPrimusTaskFactory = new ethers.ContractFactory(MockPrimusTaskABI, MockPrimusTaskBytecode, wallet);
  
  console.log('Deploying MockPrimusTask...');
  const mockPrimusTask = await MockPrimusTaskFactory.deploy();
  console.log('  Tx:', mockPrimusTask.deployTransaction.hash);
  await mockPrimusTask.deployed();
  console.log('  ✅ MockPrimusTask:', mockPrimusTask.address);
  console.log('  Explorer:', EXPLORER + '/address/' + mockPrimusTask.address);
  console.log('');

  // Check fee
  const [primusFee, attestorFee] = await mockPrimusTask.queryFee();
  console.log('  Primus Fee:', ethers.utils.formatEther(primusFee), 'ETH');
  console.log('  Attestor Fee:', ethers.utils.formatEther(attestorFee), 'ETH');
  console.log('');

  // ==========================================================================
  // STEP 2: Deploy new App with MockPrimusTask
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: DEPLOY NEW APP');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const AppBytecode = require('../artifacts/contracts/PrimusVeritasAppV4.sol/PrimusVeritasAppV4.json').bytecode;
  const AppABI = require('../artifacts/contracts/PrimusVeritasAppV4.sol/PrimusVeritasAppV4.json').abi;

  const AppFactory = new ethers.ContractFactory(AppABI, AppBytecode, wallet);

  console.log('Deploying PrimusVeritasAppV4...');
  const app = await AppFactory.deploy(
    REGISTRY_ADDRESS,
    mockPrimusTask.address,
    IDENTITY_REGISTRY,
    REPUTATION_REGISTRY
  );
  console.log('  Tx:', app.deployTransaction.hash);
  await app.deployed();
  console.log('  ✅ App:', app.address);
  console.log('  Explorer:', EXPLORER + '/address/' + app.address);
  console.log('');

  // Verify configuration
  const appPrimusTask = await app.primusTask();
  console.log('  Primus Task:', appPrimusTask);
  console.log('  Identity Registry:', await app.identityRegistry());
  console.log('');

  // ==========================================================================
  // STEP 3: Configure Rules and Checks
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 3: CONFIGURE RULES AND CHECKS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Add BTC Rule
  console.log('Adding BTC Rule...');
  const btcRuleTx = await app.addRule(
    "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
    "data.rates.USD",
    2,  // decimals
    3600, // maxAge (1 hour)
    "Coinbase BTC/USD exchange rate"
  );
  console.log('  Tx:', btcRuleTx.hash);
  await btcRuleTx.wait();
  console.log('  ✅ BTC Rule added (ruleId: 0)');
  console.log('');

  // Add PriceRangeCheck for BTC
  console.log('Adding PriceRangeCheck for BTC...');
  const btcRangeParams = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'int128'],
    [6000000, 10000000]  // $60k - $100k
  );
  const btcCheckTx = await app.addCheck(0, PRICE_RANGE_V2, btcRangeParams, 100);
  console.log('  Tx:', btcCheckTx.hash);
  await btcCheckTx.wait();
  console.log('  ✅ PriceRangeCheck added (checkId: 0)');
  console.log('');

  // Add ETH Rule
  console.log('Adding ETH Rule...');
  const ethRuleTx = await app.addRule(
    "https://api.coinbase.com/v2/exchange-rates?currency=ETH",
    "data.rates.USD",
    2,  // decimals
    3600, // maxAge (1 hour)
    "Coinbase ETH/USD exchange rate"
  );
  console.log('  Tx:', ethRuleTx.hash);
  await ethRuleTx.wait();
  console.log('  ✅ ETH Rule added (ruleId: 1)');
  console.log('');

  // Add ThresholdCheck for ETH
  console.log('Adding ThresholdCheck for ETH...');
  const ethThresholdParams = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'int128'],
    [270000, 1000]  // $2,700 expected, 10% max deviation
  );
  const ethCheckTx = await app.addCheck(1, THRESHOLD_V2, ethThresholdParams, 50);
  console.log('  Tx:', ethCheckTx.hash);
  await ethCheckTx.wait();
  console.log('  ✅ ThresholdCheck added (checkId: 0)');
  console.log('');

  // ==========================================================================
  // STEP 4: Test Full Callback Flow
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 4: TEST FULL CALLBACK FLOW');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Get agentId (we found 582 earlier)
  const agentId = 582;
  console.log('Using agentId:', agentId);
  console.log('');

  // Calculate fee
  const [pFee, aFee] = await mockPrimusTask.queryFee();
  const totalFee = pFee.add(aFee.mul(1)); // 1 check
  console.log('Total fee:', ethers.utils.formatEther(totalFee), 'ETH');
  console.log('');

  // Call requestValidation
  console.log('Calling requestValidation...');
  const requestTx = await app.requestValidation(
    agentId,
    0, // ruleId = BTC
    [0], // checkIds = first check
    { value: totalFee, gasLimit: 1000000 }
  );
  console.log('  Tx:', requestTx.hash);
  const requestReceipt = await requestTx.wait();
  console.log('  ✅ Transaction confirmed');
  console.log('  Status:', requestReceipt.status === 1 ? 'SUCCESS' : 'FAILED');
  console.log('');

  // Get taskId from events
  let taskId;
  for (const log of requestReceipt.logs) {
    try {
      const parsed = app.interface.parseLog(log);
      if (parsed && parsed.name === 'ValidationRequested') {
        taskId = parsed.args.taskId;
        console.log('  TaskId:', taskId);
      }
    } catch (e) {}
  }
  console.log('');

  if (taskId) {
    // Complete the task manually (simulating Primus callback)
    console.log('Simulating Primus callback...');
    console.log('  Creating attestation data for BTC price...');
    
    // Create attestation data (BTC price ~$68,000)
    const attestationData = JSON.stringify({ btcPrice: "68000.00" });
    const timestamp = Math.floor(Date.now() / 1000);
    
    console.log('  Data:', attestationData);
    console.log('  Timestamp:', timestamp);
    console.log('');

    // Complete the task
    console.log('Calling completeTask...');
    const completeTx = await mockPrimusTask.completeTask(
      taskId,
      wallet.address, // recipient
      "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
      attestationData,
      timestamp
    );
    console.log('  Tx:', completeTx.hash);
    const completeReceipt = await completeTx.wait();
    console.log('  ✅ Task completed');
    console.log('  Status:', completeReceipt.status === 1 ? 'SUCCESS' : 'FAILED');
    console.log('');

    // Check for CheckPassed event
    console.log('Events emitted:');
    for (const log of completeReceipt.logs) {
      try {
        const parsed = app.interface.parseLog(log);
        if (parsed) {
          console.log('  -', parsed.name);
          if (parsed.args.score) console.log('    score:', parsed.args.score.toString());
          if (parsed.args.value) console.log('    value:', parsed.args.value.toString());
        }
      } catch (e) {}
    }
    console.log('');
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('DEPLOYMENT SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  console.log('Deployed Contracts:');
  console.log('  MockPrimusTask:', mockPrimusTask.address);
  console.log('  PrimusVeritasAppV4:', app.address);
  console.log('');

  console.log('Explorer Links:');
  console.log('  ' + EXPLORER + '/address/' + mockPrimusTask.address);
  console.log('  ' + EXPLORER + '/address/' + app.address);
  console.log('');

  console.log('╔═════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║     V4 System with MockPrimusTask Deployed! ✅                                       ║');
  console.log('╚═════════════════════════════════════════════════════════════════════════════════════╝');
  console.log('');
}

main().catch(console.error);
