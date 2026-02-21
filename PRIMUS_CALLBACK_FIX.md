# Primus Auto-Callback Fix

## The Problem

Previous V4 contracts had **wrong callback assumptions**:

1. **Wrong caller**: Used `onlyPrimus` (checking attestor address)
   - Actually, the **Task contract** calls the callback, not the attestor directly
   
2. **Wrong signature**: Some contracts had flattened parameters
   - Correct: `reportTaskResultCallback(bytes32, TaskResult, bool)`

## The Solution (V5)

`PrimusVeritasAppV5.sol` implements the correct Primus callback interface:

```solidity
// Stores Task contract address
IPrimusTask public immutable primusTask;

// Only Task contract can call callback
modifier onlyTask() {
    require(msg.sender == address(primusTask), "Only task contract");
    _;
}

// Correct callback signature
function reportTaskResultCallback(
    bytes32 taskId,
    TaskResult calldata taskResult,  // Nested struct from Primus
    bool success
) external onlyTask {
    // Process attestation automatically
}
```

## Key Flow

```
User -> appV5.requestValidation()
  └─> primusTask.submitTask(..., callback=appV5.address)  [PAYS FEE]
       └─> Primus network processes attestation
            └─> primusTask calls appV5.reportTaskResultCallback()
                 └─> Automatic validation & scoring
```

## Usage

### 1. Deploy V5

```bash
cd /home/xiang/.openclaw/workspace
npx hardhat run scripts/deploy-and-test-v5.js --network baseSepolia
```

### 2. Key Differences from V2

| V2 (Manual) | V5 (Auto-Callback) |
|-------------|-------------------|
| User calls `requestVerification()` | User calls `requestValidation()` |
| User manually calls SDK `attest()` | Primus handles attestation |
| User manually calls `submitAttestation()` | **Automatic callback processes result** |

### 3. SDK Integration

When using Primus SDK, pass the V5 contract address as callback:

```javascript
const result = await primus.attest({
  taskId,
  taskTxHash: tx.hash,
  taskAttestors: ['0x0DE886e31723e64Aa72e51977B14475fB66a9f72'],
  requests: [{ 
    url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC', 
    method: 'GET' 
  }],
  responseResolves: [[{ 
    keyName: 'btcPrice', 
    parsePath: '$.data.rates.USD' 
  }]]
}, 60000);

// NO MANUAL submitAttestation() NEEDED!
// V5 contract receives callback automatically
```

## Testing

Run the test script to verify:

```bash
PRIVATE_KEY=0x... npx hardhat run scripts/deploy-and-test-v5.js --network baseSepolia
```

The script will:
1. Deploy V5
2. Add a BTC price rule
3. Submit validation request with callback
4. Monitor for Primus callback (1-2 minutes)
5. Verify automatic processing

## Fallback

If callback doesn't work, use manual processing:

```solidity
// Anyone can call this with valid Primus attestation
function processAttestation(
    bytes32 taskId,
    string calldata attestationData,
    uint64 timestamp,
    uint256 ruleId
) external
```

## Files

- `contracts/PrimusVeritasAppV5.sol` - Fixed contract
- `scripts/deploy-and-test-v5.js` - Deployment & test script
- `contracts/MockPrimusTask.sol` - For local testing

## Verification

Check callback attempts:
```solidity
uint256 count = appV5.callbackAttemptCount();
CallbackAttempt memory attempt = appV5.getCallbackAttempt(count - 1);
// attempt.caller should be the Primus Task contract
```

## Troubleshooting

### SDK Error: "type must be string, but is null"
The Primus SDK may throw internal JSON errors. If this happens:
1. The task is still submitted to Primus
2. Run the manual attestation script:
   ```bash
   TASK_ID=0x... TASK_TX_HASH=0x... APP_V5=0x... npx hardhat run scripts/manual-primus-attest.js --network baseSepolia
   ```
3. Or use the Primus SDK directly in your own script

### No Callback Received
If the callback isn't received after attest():
1. Check the Primus Task status: `scripts/check-primus-task.js`
2. Verify the callback address is set correctly
3. The Primus network may be delayed - wait a few minutes and check again
