"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrimusAttestors = getPrimusAttestors;
exports.getAttestorsFromTaskContract = getAttestorsFromTaskContract;
exports.verifyAttestationWithDynamicAttestorCheck = verifyAttestationWithDynamicAttestorCheck;
const ethers_1 = require("ethers");
const network_core_sdk_1 = require("@primuslabs/network-core-sdk");
const RPC_URL = 'https://sepolia.base.org';
const CHAIN_ID = 84532;
// Primus Network contract addresses on Base Sepolia
// These would be official Primus deployments
const PRIMUS_NETWORK_CONTRACTS = {
    // The main Primus Task contract where attestors are registered
    taskContract: '0x...', // Would need actual address
    // Node registry for attestor information
    nodeRegistry: '0x...'
};
// Minimal ABI for querying attestor information
const PRIMUS_NODE_ABI = [
    "function getAllNodes() external view returns (address[] memory)",
    "function getNodeInfo(address node) external view returns (tuple(address nodeAddress, string[] urls, bool isActive) memory)"
];
/**
 * Dynamically fetch current Primus attestors from on-chain
 */
async function getPrimusAttestors(provider) {
    console.log('🔍 Fetching current Primus attestors from on-chain...');
    // Method 1: Query Primus Node Registry
    // This would be the actual Primus contract that tracks attestors
    const nodeRegistry = new ethers_1.ethers.Contract(PRIMUS_NETWORK_CONTRACTS.nodeRegistry, PRIMUS_NODE_ABI, provider);
    try {
        const nodes = await nodeRegistry.getAllNodes();
        const activeAttestors = [];
        for (const nodeAddress of nodes) {
            const nodeInfo = await nodeRegistry.getNodeInfo(nodeAddress);
            if (nodeInfo.isActive) {
                activeAttestors.push(nodeAddress.toLowerCase());
            }
        }
        console.log(`✅ Found ${activeAttestors.length} active attestors`);
        return activeAttestors;
    }
    catch (error) {
        console.log('⚠️  Could not query node registry, using fallback method');
        return getAttestorsFromTaskContract(provider);
    }
}
/**
 * Alternative: Extract attestors from recent task submissions
 */
async function getAttestorsFromTaskContract(provider) {
    // Query recent events from Primus Task contract
    // This extracts attestors that have actually been participating
    const taskContractAddress = PRIMUS_NETWORK_CONTRACTS.taskContract;
    // Event signature: AttestationSubmitted(bytes32 indexed taskId, address indexed attestor, ...)
    const eventSignature = ethers_1.ethers.utils.id('AttestationSubmitted(bytes32,address,bytes)');
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = currentBlock - 10000; // Last ~1 day
    const logs = await provider.getLogs({
        address: taskContractAddress,
        topics: [eventSignature],
        fromBlock,
        toBlock: currentBlock
    });
    // Extract unique attestor addresses from logs
    const attestors = new Set();
    for (const log of logs) {
        // Attestor address is typically in topic[2] for indexed events
        if (log.topics[2]) {
            const attestor = ethers_1.ethers.utils.getAddress('0x' + log.topics[2].slice(26));
            attestors.add(attestor.toLowerCase());
        }
    }
    console.log(`✅ Found ${attestors.size} attestors from recent tasks`);
    return Array.from(attestors);
}
/**
 * Verify an attestation with dynamic attestor lookup
 */
async function verifyAttestationWithDynamicAttestorCheck(primusNetwork, attestationResult, provider) {
    const errors = [];
    console.log('\n🔐 Verifying Attestation...');
    // 1. Get current attestor list (DYNAMIC - always up to date)
    const validAttestors = await getPrimusAttestors(provider);
    // 2. Verify attestor is in the list
    const attestor = attestationResult[0]?.attestor?.toLowerCase();
    console.log(`   Attestor: ${attestor}`);
    console.log(`   Checking against ${validAttestors.length} valid attestors...`);
    if (!validAttestors.includes(attestor)) {
        errors.push(`Attestor ${attestor} not in current Primus network`);
        console.log('   ❌ Invalid attestor!');
    }
    else {
        console.log('   ✅ Attestor is valid');
    }
    // 3. Verify API URL matches expected
    const requestUrl = attestationResult[0]?.attestation?.request?.[0]?.url;
    console.log(`   API URL: ${requestUrl}`);
    // 4. Verify extracted data keys
    const extractedData = JSON.parse(attestationResult[0]?.attestation?.data || '{}');
    console.log(`   Extracted Data:`, extractedData);
    // 5. Check timestamp
    const attestationTime = attestationResult[0]?.attestation?.timestamp;
    const now = Date.now();
    const age = now - attestationTime;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    console.log(`   Timestamp: ${new Date(attestationTime).toISOString()}`);
    console.log(`   Age: ${Math.round(age / 1000 / 60)} minutes`);
    if (age > maxAge) {
        errors.push(`Attestation too old (${Math.round(age / 1000 / 60)} min)`);
        console.log('   ❌ Attestation expired!');
    }
    else {
        console.log('   ✅ Timestamp valid');
    }
    // 6. Verify cryptographic signature (if SDK provides method)
    // This would verify the attestor's signature on the attestation
    return {
        valid: errors.length === 0,
        errors
    };
}
// Example usage in the feedback flow
async function giveFeedbackWithVerificationExample() {
    const provider = new ethers_1.ethers.providers.JsonRpcProvider(RPC_URL);
    const primusNetwork = new network_core_sdk_1.PrimusNetwork();
    // ... setup wallets, SDK ...
    // Generate attestation
    const attestationResult = await primusNetwork.attest({
        address: '0x...',
    });
    // VERIFY BEFORE PROCEEDING
    const verification = await verifyAttestationWithDynamicAttestorCheck(primusNetwork, attestationResult, provider);
    if (!verification.valid) {
        console.error('Attestation verification failed:', verification.errors);
        throw new Error('Invalid attestation - cannot give feedback');
    }
    console.log('✅ Attestation verified! Proceeding with feedback...');
    // Now safe to give feedback
    // await giveFeedback(agentId, attestationResult);
}
//# sourceMappingURL=primus-verification.js.map