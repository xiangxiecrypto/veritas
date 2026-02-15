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
    validationRegistry: '0xC5eB0Fbc0537369af5dcCD78D799AfD3C6F5D4EE' // V2 Contract
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
    // Verification functions
    "function check2_ApiSource(string memory apiUrl) external view returns (bool)",
    "function check3_DataKeys(string memory data) external view returns (bool)",
    "function check4_Timestamp(uint256 attestationTimestamp) external view returns (bool)",
    "function verifyAttestation(string memory apiUrl, string memory data, uint256 timestamp) external view returns (bool check2, bool check3, bool check4, bool overall)",
    // Submission with 3 on-chain checks
    "function submitAttestation(uint256 agentId, bytes32 proofHash, string calldata apiEndpoint, bytes32 reportTxHash, string calldata data, uint256 timestamp, address attestor) external returns (bool)",
    // View functions
    "function getAttestation(bytes32 requestHash) external view returns (tuple(bytes32 proofHash, bytes32 reportTxHash, string apiEndpoint, uint256 timestamp, address attestor, bool verified))",
    "function getAgentAttestations(uint256 agentId) external view returns (bytes32[] memory)",
    "function getApiList() external view returns (string[] memory)",
    "function getRequiredDataKeys() external view returns (string[] memory)",
    "function isApiAllowed(string memory api) external view returns (bool)",
    "function usedProofHashes(bytes32 proofHash) external view returns (bool)",
    // Admin functions
    "function addApi(string memory api) external",
    "function addRequiredDataKey(string memory key) external",
    // Events
    "event AttestationSubmitted(uint256 indexed agentId, bytes32 indexed proofHash, address indexed attestor, string apiEndpoint, uint256 timestamp, bytes32 reportTxHash)",
    "event VerificationResult(uint256 indexed agentId, bytes32 indexed proofHash, bool check2_api, bool check3_data, bool check4_timestamp, bool overallValid)",
    "event ReputationGiven(uint256 indexed agentId, uint8 score, bytes32 proofHash)"
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
        this.primusAppId = process.env.PRIMUS_APP_ID || '';
        this.primusAppSecret = process.env.PRIMUS_APP_SECRET || '';
        if (!this.primusAppId || !this.primusAppSecret) {
            console.log('⚠️  Primus credentials not set. Attestation generation will fail.');
            return;
        }
        this.primusNetwork = new network_core_sdk_1.PrimusNetwork(this.primusAppId, this.primusAppSecret);
        await this.primusNetwork.init();
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
        // Generate attestation
        const attestResult = await this.primusNetwork.attest(requestParams, responseResolves, this.walletAddress, 1, // usePreset: true
        0 // presetNo: 0
        );
        console.log('   Task ID:', attestResult.taskId);
        console.log('   Report Tx:', attestResult.reportTxHash);
        // Verify and poll for result
        const taskResult = await this.primusNetwork.verifyAndPollTaskResult({
            taskId: attestResult.taskId,
            reportTxHash: attestResult.reportTxHash
        });
        // Extract data
        const attestationData = taskResult[0]?.attestation?.data || '{}';
        const extractedData = JSON.parse(attestationData);
        const timestamp = taskResult[0]?.attestation?.timestamp || Date.now();
        const attestor = taskResult[0]?.attestor || '';
        console.log('   Extracted data:', extractedData);
        // Step 2: Submit to contract with 3 on-chain verification checks
        console.log('\n📋 Submitting to contract with on-chain verification...');
        const submitTx = await this.validationRegistry.submitAttestation(agentId, attestResult.requestHash, request.url, attestResult.reportTxHash, attestationData, timestamp, attestor);
        const receipt = await submitTx.wait();
        // Parse verification result from events
        const verificationEvent = receipt.events?.find((e) => e.event === 'VerificationResult');
        const verification = {
            check2: verificationEvent?.args?.check2_api || false,
            check3: verificationEvent?.args?.check3_data || false,
            check4: verificationEvent?.args?.check4_timestamp || false,
            overall: verificationEvent?.args?.overallValid || false
        };
        console.log('\n✅ On-Chain Verification Results:');
        console.log(`   Check 2 (API): ${verification.check2 ? '✅' : '❌'}`);
        console.log(`   Check 3 (Data): ${verification.check3 ? '✅' : '❌'}`);
        console.log(`   Check 4 (Timestamp): ${verification.check4 ? '✅' : '❌'}`);
        console.log(`   Overall: ${verification.overall ? '✅ VALID' : '❌ INVALID'}`);
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
        const [check2, check3, check4, overall] = await this.validationRegistry.verifyAttestation(apiUrl, data, timestamp);
        return { check2, check3, check4, overall };
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
     * Check if API is allowed
     */
    async isApiAllowed(api) {
        return this.validationRegistry.isApiAllowed(api);
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
}
exports.VeritasSDK = VeritasSDK;
exports.default = VeritasSDK;
//# sourceMappingURL=sdk-v2.js.map