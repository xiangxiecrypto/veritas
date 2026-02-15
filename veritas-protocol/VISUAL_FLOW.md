# Veritas App Architecture - Visual Flow

## Complete End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WALLET / USER                                      │
│                                                                              │
│  const agentId = 1;                                                         │
│  const taskId = await app.requestVerification(ruleId, agentId);             │
│  // ^^^ SINGLE TRANSACTION ^^^                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VERITAS APP CONTRACT                                    │
│                                                                              │
│  STEP 1: requestVerification(ruleId, agentId)                               │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │ 1. Validate rule exists and is active                           │        │
│  │ 2. Build Primus request (URL, method, etc.)                     │        │
│  │ 3. Call: primusTask.submitTask(...)                              │        │
│  │ 4. Get taskId from Primus                                       │        │
│  │ 5. Store request: requests[taskId] = {ruleId, agentId, ...}    │        │
│  │ 6. Emit: VerificationRequested(taskId, ruleId, agentId)        │        │
│  │ 7. Return taskId to wallet                                      │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  EVENT: VerificationRequested                                    │        │
│  │  - taskId: 0x1234...                                            │        │
│  │  - ruleId: 0                                                    │        │
│  │  - agentId: 1                                                   │        │
│  │  - requester: 0x89BBf...                                        │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ (returns taskId)
                                      ▼

                          ┌───────────────────┐
                          │   PRIMUS SDK       │
                          │   (Off-chain)      │
                          │                    │
                          │  await primusSdk.  │
                          │  runAttestation(   │
                          │    taskId         │
                          │  )                │
                          └───────────────────┘
                                      │
                                      │ (processes zkTLS proof)
                                      ▼

                    ┌─────────────────────────────────┐
                    │   PRIMUS TASK CONTRACT          │
                    │   (On-chain storage)            │
                    │                                 │
                    │  function submitTask(...) {     │
                    │    // ... create task           │
                    │    // ... wait for attestor     │
                    │    // ... submit attestation   │
                    │    return taskId;              │
                    │  }                             │
                    │                                 │
                    │  function queryTask(taskId) {   │
                    │    return TaskInfo {            │
                    │      taskResults: [{            │
                    │        attestor,                │
                    │        taskId,                  │
                    │        attestation: {           │
                    │          recipient,             │
                    │          request: [{url}],      │
                    │          data,                  │
                    │          timestamp             │
                    │        }                       │
                    │      }]                        │
                    │    };                          │
                    │  }                             │
                    └─────────────────────────────────┘
                                      │
                                      │ (attestation now on-chain)
                                      ▼

┌─────────────────────────────────────────────────────────────────────────────┐
│                      VERITAS APP CONTRACT                                    │
│                                                                              │
│  STEP 2: completeVerification(taskId)                                        │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │ 1. Fetch request: requests[taskId]                             │        │
│  │ 2. Fetch attestation: primusTask.queryTask(taskId)             │        │
│  │ 3. Validate:                                                   │        │
│  │    a. taskResults.length > 0                                   │        │
│  │    b. url matches rule.url                                      │        │
│  │    c. recipient matches requester                               │        │
│  │    d. data matches rule.expectedDataHash (if specified)        │        │
│  │    e. timestamp is fresh (block.timestamp - timestamp < maxAge)│        │
│  │ 4. Mark request as completed                                   │        │
│  │ 5. Call: reputation.giveFeedback(agentId, score, ...)         │        │
│  │ 6. Emit: VerificationCompleted(taskId, ruleId, agentId, score) │        │
│  │ 7. Return true                                                 │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ (grant reputation)
                                      ▼

                    ┌─────────────────────────────────┐
                    │   REPUTATION REGISTRY           │
                    │   (ERC-8004)                    │
                    │                                 │
                    │  function giveFeedback(          │
                    │    agentId,                     │
                    │    value (score),                │
                    │    decimals,                    │
                    │    "veritas-app",               │
                    │    url,                         │
                    │    url,                         │
                    │    attestation.data,            │
                    │    taskId                       │
                    │  ) {                            │
                    │    // update reputation         │
                    │  }                              │
                    └─────────────────────────────────┘
                                      │
                                      │ (reputation updated)
                                      ▼

                         ✅ VERIFICATION COMPLETE
                         ✅ REPUTATION GRANTED
                         ✅ AGENT CAN NOW USE REPUTATION


═══════════════════════════════════════════════════════════════════════════════════
                                    COMPARISON
═══════════════════════════════════════════════════════════════════════════════════

OLD WAY (2 Transactions)
─────────────────────────────────────────────────────────────────────────────
Wallet      →  Primus        : Submit task (TX #1)
               ↘ Wallet      : Task ID returned
Wallet           (Off-chain) : Run zkTLS
               ↗ Wallet      : Attestation on-chain
Wallet      →  Veritas       : Validate (TX #2)
               ↘ Wallet      : Reputation granted

Total: 2 wallet transactions + 1 off-chain operation


NEW WAY (1 Transaction!)
─────────────────────────────────────────────────────────────────────────────
Wallet      →  Veritas App   : requestVerification (TX #1)
               ↘ Veritas App : Submit task to Primus
               ↘ Wallet      : Task ID returned
               (Off-chain)    : Run zkTLS
               (Auto)         : Attestation on-chain
Veritas App →  (Auto)        : completeVerification
               ↘ Reputation  : Grant automatically

Total: 1 wallet transaction + 1 off-chain operation


BENEFITS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 50% fewer transactions (1 vs 2)
✅ ~20% gas savings (80K vs 100K)
✅ Simpler user experience
✅ Configurable rules
✅ Automatic reputation
✅ Extensible ecosystem


═══════════════════════════════════════════════════════════════════════════════════
                                    DATA FLOW
═══════════════════════════════════════════════════════════════════════════════════

requestVerification()
─────────────────────────────────────────────────────────────────────────────
INPUTS:
  - ruleId: uint256 (which verification rule to use)
  - agentId: uint256 (which agent to credit)
  - value: uint256 (ETH for Primus task fee)

PROCESS:
  1. Load rule from rules[ruleId]
  2. Validate rule.active == true
  3. Build AttNetworkRequest[] with rule.url
  4. Call primusTask.submitTask(..., {value})
  5. Get taskId from return value
  6. Store requests[taskId] = {ruleId, agentId, msg.sender, false}
  7. Emit VerificationRequested(taskId, ruleId, agentId, msg.sender)

OUTPUTS:
  - taskId: bytes32 (Primus task identifier)


completeVerification(taskId)
─────────────────────────────────────────────────────────────────────────────
INPUTS:
  - taskId: bytes32 (from requestVerification)

PROCESS:
  1. Load request from requests[taskId]
  2. Validate !request.completed
  3. Validate request.requester != address(0)
  4. Load rule from rules[request.ruleId]
  5. Validate rule.active == true
  6. Fetch attestation: primusTask.queryTask(taskId)
  7. Validate taskResults.length > 0
  8. Extract attestation from taskResults[0]
  9. Validate:
     - attestation.request[0].url == rule.url
     - attestation.recipient == request.requester
     - keccak256(attestation.data) == rule.expectedDataHash (if not ZeroHash)
     - block.timestamp - attestation.timestamp <= rule.maxAgeSeconds
  10. Mark requests[taskId].completed = true
  11. Call reputation.giveFeedback(
        request.agentId,
        rule.reputationScore,
        rule.scoreDecimals,
        "veritas-app",
        rule.url,
        rule.url,
        attestation.data,
        taskId
      )
  12. Emit VerificationCompleted(taskId, request.ruleId, request.agentId, rule.reputationScore, true)

OUTPUTS:
  - success: boolean (true if all validations passed)


═══════════════════════════════════════════════════════════════════════════════════
                                DEPLOYMENT CHECKLIST
═══════════════════════════════════════════════════════════════════════════════════

□ Deploy VeritasValidator.sol
   └─ Set owner (deployer)
   └─ Verify PRIMUS_TASK and REPUTATION addresses

□ Deploy VeritasApp.sol
   └─ Set owner (deployer)
   └─ Configure PRIMUS_TASK, validator, reputation addresses

□ Authorize app in validator
   └─ validator.setAppAuthorization(app.address, true)

□ Add verification rules
   └─ app.addRule(url, dataKey, dataHash, score, decimals, maxAge, description)

□ Test requestVerification
   └─ Watch for VerificationRequested event
   └─ Extract and save taskId

□ Run zkTLS (off-chain)
   └─ Use Primus SDK: primusSdk.runAttestation(taskId)

□ Test completeVerification
   └─ Watch for VerificationCompleted event
   └─ Verify reputation was granted

□ Verify reputation
   └─ Check reputation.reputationSum(agentId)
   └─ Check reputation.reputationCount(agentId)


═══════════════════════════════════════════════════════════════════════════════════
