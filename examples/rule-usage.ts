/**
 * @fileoverview Veritas Protocol Rule Usage Example
 * @description Complete example showing how to create and use rules
 */

import { ethers, Wallet, JsonRpcProvider } from 'ethers';
import { VeritasSDK } from '@veritas/sdk';
import { RuleRegistry, HTTPCheck } from '@veritas/contracts';

import { PrimusZKTLS } from '@primus-labs/zktls-core-sdk';

async function main() {
    // Setup
    const provider = new JsonRpcProvider('https://sepolia.base.org');
    const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
    
    // Deploy contracts (in production, these are already deployed)
    console.log('Deploying Veritas contracts...');
    
    const ruleRegistry = await new RuleRegistry();
    const ruleRegistryAddress = await ruleRegistry.getAddress();
    
    const httpCheck = await new HTTPCheck();
    const httpCheckAddress = await httpCheck.getAddress();
    
    const primus = new PrimusZKTLS(config);
    await primus.init(process.env.PRIMUS_APP_ID, process.env.PRIMUS_APP_SECRET);
    
    // Create SDK instance
    const veritas = new VeritasSDK({
        signer: wallet,
        primusConfig: {
            appId: process.env.PRIMUS_APP_ID,
            appSecret: process.env.PRIMUS_APP_SECRET
        }
    });
    
    // ============================================
    // Step 1: Create Rules
    // ============================================
    
    console.log('\n=== Creating Rules ===\n');
    
    // Rule 1: Trading Orders API (POST)
    const checkData1 = ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string', 'uint256', 'uint256', 'bytes', 'bool'],
        [
            'https://api.trading.com/orders',  // Exact URL
            'POST',                              // Method
            200,                                // Min response code
            201,                                // Max response code
            '0x',                               // Data pattern (none)
            true                                // Validate parsePath
        ]
    );
    
    const tx1 = await ruleRegistry.createRule(
        'Trading Orders - Create',
        'Validate order creation calls',
        httpCheckAddress,
        checkData1
    );
    const ruleId1 = 1;
    console.log('✅ Rule 1 created:', ruleId1);
    
    // Rule 2: Market Data API (GET with wildcard)
    const checkData2 = ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string', 'uint256', 'uint256', 'bytes', 'bool'],
        [
            'https://api.market.com/*',     // Wildcard URL
            'GET',                      // Method
            200,                      // Min response code
            299,                      // Max response code
            ethers.toUtf8Bytes('"price":'),  // Data must contain "price"
            true                                // Validate parsePath
        ]
    );
    
    const tx2 = await ruleRegistry.createRule(
        'Market Data - Get',
        'Validate market data retrieval',
        httpCheckAddress,
        checkData2
    );
    const ruleId2 = 2;
    console.log('✅ Rule 2 created:', ruleId2);
    
    // ============================================
    // Step 2: Generate Attestations
    // ============================================
    
    console.log('\n=== Generating Attestations ===\n');
    
    // Attestation 1: Trading order
    const attestation1 = await veritas.attest({
        url: 'https://api.trading.com/orders',
        method: 'POST',
        body: {
            symbol: 'ETH',
            amount: 100,
            type: 'limit'
        },
        responseResolves: [{
            keyName: 'orderId',
            parseType: 'JSON',
            parsePath: '$.data.orderId'
        }, {
            keyName: 'status',
            parseType: 'JSON',
            parsePath: '$.data.status'
        }]
    });
    
    console.log('✅ Attestation 1 created');
    console.log('   Request URL:', attestation1.request.url);
    console.log('   Request Method:', attestation1.request.method);
    console.log('   ParsePath 1:', attestation1.responseResolve[0].parsePath);
    console.log('   ParsePath 2:', attestation1.responseResolve[1].parsePath);
    console.log('   Data:', attestation1.data.substring(0, 100));
    
    // Attestation 2: Market data
    const attestation2 = await veritas.attest({
        url: 'https://api.market.com/prices/ETH',
        method: 'GET',
        responseResolves: [{
            keyName: 'price',
            parseType: 'JSON',
            parsePath: '$.data.price'
        }, {
            keyName: 'timestamp',
            parseType: 'JSON',
            parsePath: '$.data.timestamp'
        }]
    });
    
    console.log('✅ Attestation 2 created');
    console.log('   Request URL:', attestation2.request.url);
    console.log('   ParsePath 1:', attestation2.responseResolve[0].parsePath);
    console.log('   Data:', attestation2.data.substring(0, 100));
    
    // ============================================
    // Step 3: Validate Attestations
    // ============================================
    
    console.log('\n=== Validating Attestations ===\n');
    
    // Validate attestation 1 against rule 1
    const result1 = await veritas.validateAttestation(
        await ruleRegistry.getValidator(),
        attestation1,
        ruleId1
    );
    
    console.log('\nAttestation 1 validation:');
    console.log('   Rule:', 'Trading Orders - Create');
    console.log('   Result:', result1.passed ? '✅ PASSED' : '❌ FAILED');
    console.log('   Hash:', result1.attestationHash);
    
    if (result1.passed) {
        const data1 = JSON.parse(attestation1.data);
        console.log('   Order ID:', data1.data.orderId);
        console.log('   Status:', data1.data.status);
    }
    
    // Validate attestation 2 against rule 2
    const result2 = await veritas.validateAttestation(
        await ruleRegistry.getValidator(),
        attestation2,
        ruleId2
    );
    
    console.log('\nAttestation 2 validation');
    console.log('   Rule:', 'Market Data - Get');
    console.log('   Result:', result2.passed ? '✅ PASSED' : '❌ FAILED');
    console.log('   Hash:', result2.attestationHash);
    
    if (result2.passed) {
        const data2 = JSON.parse(attestation2.data);
        console.log('   Price:', data2.data.price);
        console.log('   Timestamp:', new Date(data2.data.timestamp * 1000));
    }
    
    // ============================================
    // Step 4: Use Results in Business Logic
    // ============================================
    
    console.log('\n=== Business Logic Integration ===\n');
    
    // Example: Process trading order
    if (result1.passed) {
        console.log('✅ Order creation verified!');
        console.log('   Proceeding to create order on blockchain...');
        
        // Extract verified data
        const orderData = JSON.parse(attestation1.data);
        
        // Use the data with confidence - it's cryptographically verified
        console.log('   Verified Order ID:', orderData.orderId);
        console.log('   Verified Status:', orderData.status);
        
        // Business logic: submit to blockchain, etc.
        // ...
    } else {
        console.log('❌ Order creation verification failed!');
        console.log('   Rejecting order submission');
    }
    
    console.log('\n✅ Example completed successfully!');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
}
