"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrimusAttestationVerifier = exports.VeritasSDK = void 0;
const ethers_1 = require("ethers");
const network_core_sdk_1 = require("@primuslabs/network-core-sdk");
const PrimusAttestationVerifier_1 = require("./PrimusAttestationVerifier");
Object.defineProperty(exports, "PrimusAttestationVerifier", { enumerable: true, get: function () { return PrimusAttestationVerifier_1.PrimusAttestationVerifier; } });
// ============================================================
// ERC-8004 Official Contract Addresses on Base
// ============================================================
const BASE_MAINNET = {
    identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
    validationRegistry: '0x0000000000000000000000000000000000000000' // TBD
};
const BASE_SEPOLIA = {
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
    validationRegistry: '0x439D0B5C814CFD120D4B471051fF609c992F89C9' // V2.1 Contract (timestamp fix)
};
// ============================================================
// ERC-8004 Standard ABIs
// ============================================================
const IDENTITY_REGISTRY_ABI = [
    "function ownerOf(uint256 tokenId) external view returns (address)",
    "function tokenURI(uint256 tokenId) external view returns (string)",
    "function balanceOf(address owner) external view returns (uint256)",
    "function register(string agentURI) external returns (uint256 agentId)",
    "function setAgentURI(uint256 agentId, string calldata newURI) external",
    "function getAgentWallet(uint256 agentId) external view returns (address)",
    "function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external",
    "function getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes memory)",
    "function setMetadata(uint256 agentId, string metadataKey, bytes metadataValue) external",
    "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)"
];
const REPUTATION_REGISTRY_ABI = [
    "function getIdentityRegistry() external view returns (address)",
    "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string calldata tag1, string calldata tag2, string calldata endpoint, string calldata feedbackURI, bytes32 feedbackHash) external",
    "function getSummary(uint256 agentId, address[] calldata clientAddresses, string tag1, string tag2) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)",
    "function getClients(uint256 agentId) external view returns (address[] memory)"
];
// V2 Contract ABI with 3 on-chain checks
const VALIDATION_REGISTRY_V2_ABI = [
    "function identityRegistry() external view returns (address)",
    "function reputationRegistry() external view returns (address)",
    "function owner() external view returns (address)",
    "function DEFAULT_MAX_AGE() external view returns (uint256)",
    "function REPUTATION_EXCELLENT() external view returns (uint8)",
    "function REPUTATION_GOOD() external view returns (uint8)",
    "function REPUTATION_FAIR() external view returns (uint8)",
    // Verification functions - meaningful names
    "function isApiAllowed(string memory apiUrl) external view returns (bool isAllowed)",
    "function isDataComplete(string memory data) external view returns (bool isComplete)",
    "function isTimestampFresh(uint256 attestationTimestamp) external view returns (bool isFresh)",
    "function verifyAttestation(string memory apiUrl, string memory data, uint256 timestamp) external view returns (bool apiAllowed, bool dataComplete, bool timestampFresh, bool overallValid)",
    // V3: Minimal submit with hashes only
    "function submitAttestation(uint256 agentId, bytes32 taskId, bytes32 apiEndpointHash, bytes32 dataHash) external returns (bool)",
    "function debugVerification(bytes32 taskId, bytes32 apiEndpointHash, bytes32 dataHash) external view returns (bool hasResults, address recipient, bool recipientMatch, string memory apiUrl, bool apiHashMatch, string memory data, bool dataHashMatch, uint256 timestamp, bool fresh, bool overallValid)",
    // Admin functions
    "function setPrimusTaskContract(address _primusTaskContract) external",
    // Events
    "event AttestationVerified(uint256 indexed agentId, bytes32 indexed taskId, bool recipientMatch, bool apiHashMatch, bool dataHashMatch, bool fresh, bool overallValid)",
    "event ReputationGiven(uint256 indexed agentId, uint8 score, bytes32 taskId)"
];
// ============================================================
// Veritas SDK V2
// ============================================================
class VeritasSDK {
    constructor(config) {
        this.provider = config.provider;
        this.signer = config.signer;
        this.network = config.network || 'sepolia';
        this.chainId = config.chainId || (this.network === 'mainnet' ? 8453 : 84532);
        const addresses = this.network === 'mainnet' ? BASE_MAINNET : BASE_SEPOLIA;
        // Use provided address or default
        const validationRegistryAddress = config.validationRegistryAddress || addresses.validationRegistry;
        this.identityRegistry = new ethers_1.ethers.Contract(addresses.identityRegistry, IDENTITY_REGISTRY_ABI, this.signer);
        this.reputationRegistry = new ethers_1.ethers.Contract(addresses.reputationRegistry, REPUTATION_REGISTRY_ABI, this.signer);
        this.validationRegistry = new ethers_1.ethers.Contract(validationRegistryAddress, VALIDATION_REGISTRY_V2_ABI, this.signer);
    }
    async initialize() {
        this.walletAddress = await this.signer.getAddress();
        // Initialize Primus Network SDK
        // Note: init() takes (provider, chainId) but needs a signer attached to provider
        // or we need to pass the signer directly
        this.primusNetwork = new network_core_sdk_1.PrimusNetwork();
        // Create a provider with signer for Primus
        const providerWithSigner = new ethers_1.ethers.providers.JsonRpcProvider(this.network === 'mainnet' ? 'https://mainnet.base.org' : 'https://sepolia.base.org');
        const wallet = new ethers_1.ethers.Wallet(process.env.PRIVATE_KEY || '', providerWithSigner);
        await this.primusNetwork.init(wallet, this.chainId);
        console.log('✅ Primus Network SDK initialized');
    }
    // ============================================================
    // IDENTITY REGISTRY (ERC-8004)
    // ============================================================
    async registerAgent(agent) {
        const agentURI = `data:application/json;base64,${Buffer.from(JSON.stringify({
            type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
            name: agent.name,
            description: agent.description,
            image: agent.image || "",
            services: agent.services,
            x402Support: agent.x402Support || false,
            active: agent.active !== false,
            supportedTrust: agent.supportedTrust || ["reputation", "primus-zktls"]
        })).toString('base64')}`;
        const tx = await this.identityRegistry.register(agentURI);
        const receipt = await tx.wait();
        // Parse agentId from event
        const event = receipt.events?.find((e) => e.event === 'Registered');
        const agentId = event?.args?.agentId?.toNumber();
        console.log(`✅ Agent registered with ID: ${agentId}`);
        return agentId;
    }
    async getAgentOwner(agentId) {
        return this.identityRegistry.ownerOf(agentId);
    }
    async isAgentOwner(agentId, address) {
        const owner = await this.getAgentOwner(agentId);
        const checkAddress = address || this.walletAddress;
        return owner.toLowerCase() === checkAddress.toLowerCase();
    }
    // ============================================================
    // REPUTATION REGISTRY (ERC-8004)
    // ============================================================
    async giveFeedback(agentId, feedback) {
        const tx = await this.reputationRegistry.giveFeedback(agentId, feedback.value, feedback.valueDecimals || 0, feedback.tag1 || '', feedback.tag2 || '', feedback.endpoint || '', feedback.feedbackURI || '', feedback.feedbackHash || ethers_1.ethers.constants.HashZero);
        return tx;
    }
    async getReputationSummary(agentId, clientAddresses, tag1, tag2) {
        if (!clientAddresses || clientAddresses.length === 0) {
            throw new Error('clientAddresses is required - specify which reputation clients to query (e.g., [validationRegistryAddress])');
        }
        const [count, summaryValue, decimals] = await this.reputationRegistry.getSummary(agentId, clientAddresses, tag1 || '', tag2 || '');
        return {
            count: count.toNumber(),
            averageValue: summaryValue.toNumber() / Math.pow(10, decimals),
            decimals: decimals
        };
    }
    // ============================================================
    // VALIDATION REGISTRY V2 - 3 ON-CHAIN CHECKS
    // ============================================================
    /**
     * Generate attestation using Primus Network SDK then submit to contract
     * with 3 on-chain verification checks
     */
    async generateAndSubmitAttestation(agentId, request) {
        if (!this.primusNetwork) {
            throw new Error('Primus Network not initialized. Call initialize() first.');
        }
        // Step 1: Generate attestation via Primus Network
        console.log('🔐 Generating Primus attestation...');
        const requestParams = {
            url: request.url,
            method: request.method || 'GET',
            header: request.headers ? JSON.stringify(request.headers) : '',
            body: request.body || ''
        };
        const responseResolves = request.extracts.map(e => ({
            keyName: e.key,
            parseType: '',
            parsePath: e.path
        }));
        // Step 1: Submit task to Primus Network
        console.log('   Step 1: Submitting task to Primus Network...');
        const submitResult = await this.primusNetwork.submitTask({
            address: this.walletAddress
        });
        console.log('   Submit Result:', JSON.stringify(submitResult, null, 2));
        // Step 2: Generate attestation with task info
        console.log('   Step 2: Generating attestation...');
        const attestParams = {
            address: this.walletAddress,
            userAddress: this.walletAddress,
            taskId: submitResult.taskId,
            taskTxHash: submitResult.taskTxHash,
            taskAttestors: submitResult.taskAttestors,
            requests: [requestParams],
            responseResolves: [responseResolves]
        };
        console.log('   AttestParams:', JSON.stringify(attestParams, null, 2));
        const attestResultList = await this.primusNetwork.attest(attestParams, 60000 // timeout
        );
        console.log('   Attest Result:', JSON.stringify(attestResultList, null, 2));
        // attestResultList is RawAttestationResultList (array)
        const attestResult = attestResultList[0];
        console.log('   Task ID:', attestResult?.taskId);
        console.log('   Report Tx:', attestResult?.reportTxHash);
        console.log('   Attestor:', attestResult?.attestor);
        // Extract data directly from attest result (no need to verifyAndPoll)
        const attestationData = attestResult?.attestation?.data || '{}';
        const extractedData = JSON.parse(attestationData);
        // Convert timestamp to seconds if it's in milliseconds
        let timestamp = parseInt(attestResult?.attestation?.timestamp) || Math.floor(Date.now() / 1000);
        if (timestamp > 10000000000) { // If timestamp is in milliseconds (has more than 10 digits)
            timestamp = Math.floor(timestamp / 1000);
        }
        const attestor = attestResult?.attestor || '';
        const reportTxHash = attestResult?.reportTxHash || '';
        const taskId = attestResult?.taskId || '';
        console.log('   Extracted data:', extractedData);
        // Step 2: Submit to V3 contract with minimal verification
        console.log('\n📋 Submitting to V3 contract with hash verification...');
        // V3: Compute hashes instead of passing full strings
        const apiEndpointHash = ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.toUtf8Bytes(request.url));
        const dataHash = ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.toUtf8Bytes(attestationData));
        const taskIdBytes32 = taskId.startsWith('0x') ? taskId : '0x' + taskId;
        console.log('   Hashes:');
        console.log(`   API Hash: ${apiEndpointHash}`);
        console.log(`   Data Hash: ${dataHash}`);
        console.log(`   Task ID: ${taskIdBytes32}`);
        const submitTx = await this.validationRegistry.submitAttestation(agentId, taskIdBytes32, // taskId
        apiEndpointHash, // keccak256(apiUrl)
        dataHash // keccak256(data)
        );
        const receipt = await submitTx.wait();
        // Parse verification result from events
        const verificationEvent = receipt.events?.find((e) => e.event === 'AttestationVerified');
        const verification = {
            // V3 check names
            recipientMatch: verificationEvent?.args?.recipientMatch || false,
            apiHashMatch: verificationEvent?.args?.apiHashMatch || false,
            dataHashMatch: verificationEvent?.args?.dataHashMatch || false,
            fresh: verificationEvent?.args?.fresh || false,
            overall: verificationEvent?.args?.overallValid || false,
            // Legacy names for backward compatibility
            apiCheck: verificationEvent?.args?.apiHashMatch || false,
            dataCheck: verificationEvent?.args?.dataHashMatch || false,
            timestampCheck: verificationEvent?.args?.fresh || false,
            check2: verificationEvent?.args?.apiHashMatch || false,
            check3: verificationEvent?.args?.dataHashMatch || false,
            check4: verificationEvent?.args?.fresh || false
        };
        console.log('\n✅ On-Chain Verification Results:');
        console.log(`   Recipient Match:   ${verification.recipientMatch ? '✅' : '❌'}`);
        console.log(`   API Hash Match:    ${verification.apiHashMatch ? '✅' : '❌'}`);
        console.log(`   Data Hash Match:   ${verification.dataHashMatch ? '✅' : '❌'}`);
        console.log(`   Fresh:             ${verification.fresh ? '✅' : '❌'}`);
        console.log(`   Overall:           ${verification.overall ? '✅ VALID' : '❌ INVALID'}`);
        const attestationResult = {
            requestHash: attestResult.requestHash,
            taskId: attestResult.taskId,
            timestamp,
            data: extractedData,
            reportTxHash: attestResult.reportTxHash
        };
        return {
            attestation: attestationResult,
            verification,
            tx: receipt
        };
    }
    /**
     * Verify attestation parameters on-chain before submitting
     */
    async verifyAttestationOnChain(apiUrl, data, timestamp) {
        const [apiAllowed, dataComplete, timestampFresh, overall] = await this.validationRegistry.verifyAttestation(apiUrl, data, timestamp);
        return {
            apiCheck: apiAllowed,
            dataCheck: dataComplete,
            timestampCheck: timestampFresh,
            overall
        };
    }
    /**
     * Get list of allowed APIs from contract
     */
    async getAllowedApis() {
        return this.validationRegistry.getApiList();
    }
    /**
     * Get list of required data keys from contract
     */
    async getRequiredDataKeys() {
        return this.validationRegistry.getRequiredDataKeys();
    }
    /**
     * Check if API is in whitelist
     */
    async isApiAllowed(api) {
        return this.validationRegistry.isApiInWhitelist(api);
    }
    /**
     * Get agent attestations
     */
    async getAgentAttestations(agentId) {
        return this.validationRegistry.getAgentAttestations(agentId);
    }
    /**
     * Get attestation details
     */
    async getAttestation(requestHash) {
        const result = await this.validationRegistry.getAttestation(requestHash);
        return {
            proofHash: result.proofHash,
            reportTxHash: result.reportTxHash,
            apiEndpoint: result.apiEndpoint,
            timestamp: result.timestamp.toNumber(),
            attestor: result.attestor,
            verified: result.verified
        };
    }
    // ============================================================
    // MOLTBOOK HELPERS
    // ============================================================
    async verifyMoltbookOwnership(agentId, moltbookName) {
        // Generate attestation from Moltbook API
        const result = await this.generateAndSubmitAttestation(agentId, {
            url: `https://www.moltbook.com/api/v1/agents/${moltbookName}`,
            method: 'GET',
            extracts: [
                { key: 'agentName', path: '$.agent.name' },
                { key: 'ownerAddress', path: '$.agent.wallet_address' },
                { key: 'moltbookAgentId', path: '$.agent.id' }
            ]
        });
        // Check if extracted owner matches registered wallet
        const extractedOwner = (result.attestation.data.ownerAddress || '').toLowerCase();
        const registeredOwner = this.walletAddress.toLowerCase();
        const ownerMatch = extractedOwner === registeredOwner;
        return {
            result: result.verification,
            attestation: result.attestation,
            ownerMatch,
            extractedOwner
        };
    }
    // ============================================================
    // BACKWARD COMPATIBILITY (Legacy method names)
    // ============================================================
    /**
     * @deprecated Use generateAndSubmitAttestation() instead
     */
    async generateAttestation(agentId, request) {
        const result = await this.generateAndSubmitAttestation(agentId, request);
        return result.attestation;
    }
    /**
     * @deprecated Use verifyAttestationOnChain() instead
     */
    async verifyAttestation(attestationResult) {
        // Handle both string (requestHash) and array formats
        if (typeof attestationResult === 'string') {
            // Old format - requestHash
            return this.getValidationStatus(attestationResult);
        }
        // New format - array with attestation data
        const apiUrl = attestationResult[0]?.attestation?.request?.[0]?.url || '';
        const data = attestationResult[0]?.attestation?.data || '{}';
        const timestamp = attestationResult[0]?.attestation?.timestamp || Date.now();
        const result = await this.verifyAttestationOnChain(apiUrl, data, timestamp);
        // Return both old and new format for compatibility
        return {
            // New check names
            apiCheck: result.apiCheck,
            dataCheck: result.dataCheck,
            timestampCheck: result.timestampCheck,
            overall: result.overall,
            // Old names for backward compatibility
            check2: result.apiCheck,
            check3: result.dataCheck,
            check4: result.timestampCheck
        };
    }
    /**
     * Get validation status (backward compatibility)
     */
    async getValidationStatus(requestHash) {
        const attestation = await this.getAttestation(requestHash);
        return {
            isValid: attestation.verified,
            agentId: 0, // Not stored in new format
            validator: attestation.attestor,
            response: attestation.verified ? 100 : 0,
            timestamp: attestation.timestamp
        };
    }
    /**
     * @deprecated Use getAgentAttestations() instead
     */
    async getAgentValidations(agentId) {
        return this.getAgentAttestations(agentId);
    }
}
exports.VeritasSDK = VeritasSDK;
exports.default = VeritasSDK;
//# sourceMappingURL=sdk.js.map