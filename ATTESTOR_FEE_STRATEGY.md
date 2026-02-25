# Attestor Fee Strategy - Making Attestors Profitable

## Current Situation

### Fee Structure
The attestation fee is set by the **Primus TaskContract**, not by Veritas Protocol.

```solidity
// In Primus TaskContract
FeeInfo memory feeInfo = primusTask.queryLatestFeeInfo(0);
// Returns:
// - primusFee: Fee for Primus Network
// - attestorFee: Fee for the attestor
// - Total = (primusFee + attestorFee) * attestorCount
```

### Current Fees (Base Sepolia Testnet)
- **Attestor Fee**: 0.00000001 ETH ($0.00002)
- **Attestor Costs**:
  - Gas: $0.0006
  - Infrastructure: $0.02-0.05
  - **Total Cost**: $0.02-0.05
- **Net Profit**: **-$0.02 to -$0.05** (LOSS)

---

## How to Set Profitable Fees

### Step 1: Calculate Break-Even Fee

```
Break-Even Fee = Gas Cost + Infrastructure Cost

Example:
- Gas Cost: $0.0006 (250,000 gas × 0.001 gwei × $2500/ETH)
- Infra Cost: $0.02 (zkTLS computation, servers)
- Break-Even: $0.0206

In ETH: $0.0206 / $2500 = 0.00000824 ETH (8.24 × 10^18 wei)
```

### Step 2: Add Profit Margin

```
Profitable Fee = Break-Even Fee × (1 + Profit Margin)

Example with 50% margin:
- Profitable Fee = $0.0206 × 1.5 = $0.0309
- In ETH: 0.00001236 ETH (12.36 × 10^18 wei)
```

### Step 3: Compare to Current Fee

```
Current:  0.00000001 ETH (10^10 wei)
Needed:   0.00001236 ETH (1.236 × 10^16 wei)

Increase needed: 1,236x more
```

---

## Fee Models

### Model 1: Fixed Fee (Simple)

**Pros:**
- Easy to understand
- Predictable costs
- Simple implementation

**Cons:**
- Doesn't account for gas price fluctuations
- May over/under charge during volatility

**Implementation:**
```solidity
// Set in Primus TaskContract
attestorFee = 0.00001236 ether; // $0.03 at $2500/ETH
```

### Model 2: Dynamic Fee (Gas-Based)

**Pros:**
- Automatically adjusts to gas prices
- Always profitable for attestors
- Fair to users

**Cons:**
- More complex
- Unpredictable costs for users

**Implementation:**
```solidity
// Calculate based on gas price
uint256 gasPrice = tx.gasprice;
uint256 attestorGasCost = 250000 * gasPrice; // 250k gas
uint256 infraCost = 0.002 ether; // $5 at $2500/ETH
uint256 attestorFee = attestorGasCost + infraCost;
```

### Model 3: Tiered Pricing

**Pros:**
- Flexible for different use cases
- High-value validations pay more
- Budget options available

**Cons:**
- Complex pricing structure
- User confusion

**Implementation:**
```
Basic Tier:
- 1 attestor
- Standard response time
- Fee: $0.03

Premium Tier:
- 3 attestors
- Fast response time
- Fee: $0.10

Enterprise Tier:
- 5+ attestors
- Instant response
- SLA guaranteed
- Fee: $0.50+
```

### Model 4: Subscription (Best for Frequent Users)

**Pros:**
- Predictable costs
- Volume discounts
- User loyalty

**Cons:**
- Requires user tracking
- Payment processing

**Implementation:**
```
Free Tier:
- 10 validations/month
- $0.03 each after

Pro Tier ($100/month):
- 500 validations/month
- $0.02 each after

Enterprise Tier ($1000/month):
- Unlimited validations
- Priority support
```

---

## Recommended Strategy

### Phase 1: Testnet (Current)
**Goal:** Test functionality, not economics

```
Current Fee: $0.00002 (subsidized)
Status: Acceptable for testing
Action: Keep as-is until mainnet
```

### Phase 2: Mainnet Launch
**Goal:** Sustainable but accessible

```
Recommended Fee: $0.05 per attestation
- Gas: $0.0006
- Infra: $0.02
- Profit: $0.0294 (59% margin)

In ETH: 0.00002 ETH (at $2500/ETH)
```

### Phase 3: Mature Market
**Goal:** Competitive pricing with volume discounts

```
Base Fee: $0.03
Volume Discount:
- 100+ validations: $0.02 each
- 1000+ validations: $0.01 each
- 10,000+ validations: Custom pricing
```

---

## How to Implement Fee Changes

### Option 1: Modify Primus TaskContract (If You Own It)

```solidity
// In Primus TaskContract
function setFeeInfo(uint256 _primusFee, uint256 _attestorFee) external onlyOwner {
    primusFee = _primusFee;
    attestorFee = _attestorFee;
    feeSettedAt = uint64(block.timestamp);
}

// Call with new fees
setFeeInfo(
    0.00000001 ether,  // Primus fee (keep low)
    0.00002 ether      // Attestor fee ($0.05 at $2500/ETH)
);
```

### Option 2: Use Custom TaskContract

Deploy your own TaskContract with custom fee logic:

```solidity
contract VeritasTaskContract {
    uint256 public attestorFee = 0.00002 ether; // $0.05
    
    function setAttestorFee(uint256 newFee) external onlyOwner {
        attestorFee = newFee;
    }
    
    function queryLatestFeeInfo(uint8) external view returns (FeeInfo memory) {
        return FeeInfo({
            primusFee: 0,
            attestorFee: attestorFee,
            settedAt: uint64(block.timestamp)
        });
    }
}
```

### Option 3: Add Fee Override in Veritas Contract

```solidity
// In PrimusVeritasApp.sol
uint256 public minAttestorFee = 0.00002 ether;

function requestValidation(...) external payable {
    FeeInfo memory feeInfo = primusTask.queryLatestFeeInfo(0);
    
    // Enforce minimum fee
    uint256 effectiveFee = feeInfo.attestorFee;
    if (effectiveFee < minAttestorFee) {
        effectiveFee = minAttestorFee;
    }
    
    uint256 totalFee = (feeInfo.primusFee + effectiveFee) * attestorCount;
    require(msg.value >= totalFee, "Insufficient fee");
    
    // ... rest of function
}
```

---

## Economic Analysis

### Cost Structure Per Attestation

| Cost Component | Current Cost | Notes |
|----------------|--------------|-------|
| **Attestor Gas** | $0.0006 | 250k gas × 0.001 gwei |
| **Attestor Infra** | $0.02-0.05 | zkTLS, servers |
| **Total Cost** | $0.02-0.05 | Break-even point |
| **Current Fee** | $0.00002 | 10^10 wei |
| **Current Profit** | **-$0.02** | LOSS |

### Recommended Fee Structure

| Tier | Fee | Margin | Target User |
|------|-----|--------|-------------|
| **Basic** | $0.03 | 33% | Small agents |
| **Standard** | $0.05 | 59% | Medium agents |
| **Premium** | $0.10 | 79% | Enterprise |

### Volume Pricing Impact

| Validations/Month | Fee Each | Monthly Cost | Savings |
|-------------------|----------|--------------|---------|
| 10 | $0.05 | $0.50 | Baseline |
| 100 | $0.03 | $3.00 | 40% |
| 1,000 | $0.02 | $20.00 | 60% |
| 10,000 | $0.01 | $100.00 | 80% |

---

## Implementation Roadmap

### Week 1: Analysis
- [ ] Run `node check-primus-fees.js` to query current fees
- [ ] Survey attestors about infrastructure costs
- [ ] Determine target profit margin (recommend 50%)

### Week 2: Design
- [ ] Choose pricing model (recommend: fixed fee + volume discounts)
- [ ] Calculate break-even fees for mainnet
- [ ] Design subscription tiers (if applicable)

### Week 3: Implementation
- [ ] Deploy custom TaskContract OR
- [ ] Modify existing TaskContract OR
- [ ] Add fee override in Veritas contract
- [ ] Update SDK with new fee structure

### Week 4: Testing
- [ ] Test on Base Sepolia with new fees
- [ ] Verify attestors are profitable
- [ ] Check user experience (fees reasonable?)
- [ ] Deploy to mainnet

---

## Quick Start

### 1. Check Current Fees
```bash
npx hardhat run check-primus-fees.js --network baseSepolia
```

### 2. Calculate Profitable Fee
```javascript
const gasCost = 0.0006; // USD
const infraCost = 0.02; // USD
const profitMargin = 0.5; // 50%

const profitableFee = (gasCost + infraCost) * (1 + profitMargin);
// Result: $0.0309

const feeInEth = profitableFee / 2500; // At $2500/ETH
// Result: 0.00001236 ETH
```

### 3. Update Fee (if you own TaskContract)
```javascript
const newFee = ethers.utils.parseEther("0.00001236");
await taskContract.setAttestorFee(newFee);
```

---

## Conclusion

**To make attestors profitable:**

1. **Minimum Fee**: $0.03 per attestation (for break-even + 50% margin)
2. **Implementation**: Deploy custom TaskContract or modify existing one
3. **Pricing Model**: Start with fixed fee, add volume discounts later
4. **Timeline**: Implement before mainnet launch

**Current status:**
- Attestors lose ~$0.02 per attestation
- Subsidized by Primus for testing
- Must fix before production

**Recommended action:**
Deploy custom TaskContract with $0.05 fixed fee, add volume discounts for high-volume users.
