import { ethers } from 'ethers';
import { PrimusCoreTLS } from '@primuslabs/zktls-core-sdk';

// ============================================================
// ERC-8004 Official Contract Addresses on Base
// ============================================================
const BASE_MAINNET = {
  // Official ERC-8004 Identity Registry (ERC-721 based)
  identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  // Official ERC-8004 Reputation Registry
  reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
  // Veritas-specific Validation Registry (Primus zkTLS enabled)
  // TODO: Deploy and update this address
  validationRegistry: '0x0000000000000000000000000000000000000000'
};

const BASE_SEPOLIA = {
  identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  validationRegistry: '0x0000000000000000000000000000000000000000'
};

// ============================================================
// ERC-8004 Standard ABIs (minimal interfaces)
// ============================================================

const IDENTITY_REGISTRY_ABI = [
  // ERC-721 standard
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function balanceOf(address owner) external view returns (uint256)",
  // ERC-8004 specific
  "function register(string agentURI) external returns (uint256 agentId)",
  "function setAgentURI(uint256 agentId, string calldata newURI) external",
  "function getAgentWallet(uint256 agentId) external view returns (address)",
  "function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external",
  "function getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes memory)",
  "function setMetadata(uint256 agentId, string metadataKey, bytes metadataValue) external",
  // Events
  "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)",
  "event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy)",
  "event MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey, string metadataKey, bytes metadataValue)"
];

const REPUTATION_REGISTRY_ABI = [
  "function getIdentityRegistry() external view returns (address)",
  "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string calldata tag1, string calldata tag2, string calldata endpoint, string calldata feedbackURI, bytes32 feedbackHash) external",
  "function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external",
  "function appendResponse(uint256 agentId, address clientAddress, uint64 feedbackIndex, string calldata responseURI, bytes32 responseHash) external",
  "function getSummary(uint256 agentId, address[] calldata clientAddresses, string tag1, string tag2) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)",
  "function readFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex) external view returns (int128 value, uint8 valueDecimals, string tag1, string tag2, bool isRevoked)",
  "function getClients(uint256 agentId) external view returns (address[] memory)",
  "function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64)",
  // Events
  "event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)",
  "event FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex)",
  "event ResponseAppended(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, address indexed responder, string responseURI, bytes32 responseHash)"
];

const VALIDATION_REGISTRY_ABI = [
  "function initialize(address identityRegistry_) external",
  "function getIdentityRegistry() external view returns (address)",
  "function validationRequest(address validatorAddress, uint256 agentId, string calldata requestURI, bytes32 requestHash) external",
  "function validationResponse(bytes32 requestHash, uint8 response, string calldata responseURI, bytes32 responseHash, string calldata tag) external",
  "function submitPrimusAttestation(uint256 agentId, bytes32 proofHash, string calldata apiEndpoint, bytes calldata primusProof, string calldata requestURI) external returns (bytes32)",
  "function getValidationStatus(bytes32 requestHash) external view returns (address validatorAddress, uint256 agentId, uint8 response, bytes32 responseHash, string tag, uint256 lastUpdate)",
  "function getValidation(bytes32 requestHash) external view returns (tuple(address validatorAddress,uint256 agentId,uint8 response,bytes32 responseHash,string tag,uint256 lastUpdate,string requestURI,bytes32 requestHash,bool exists), tuple(bytes32 proofHash,bytes primusProof,string apiEndpoint,uint256 timestamp,bool verified))",
  "function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory)",
  "function getValidatorRequests(address validatorAddress) external view returns (bytes32[] memory)",
  "function getSummary(uint256 agentId, address[] calldata validatorAddresses, string calldata tag) external view returns (uint64 count, uint8 averageResponse)",
  "function authorizedValidators(address) external view returns (bool)",
  // Events
  "event ValidationRequest(address indexed validatorAddress, uint256 indexed agentId, string requestURI, bytes32 indexed requestHash)",
  "event ValidationResponse(address indexed validatorAddress, uint256 indexed agentId, bytes32 indexed requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag)"
];

// ============================================================
// TypeScript Interfaces
// ============================================================

export interface VeritasConfig {
  provider: ethers.providers.Provider;
  signer?: ethers.Signer;
  network?: 'mainnet' | 'sepolia';
  validationRegistryAddress?: string; // Override default
}

export interface AgentRegistration {
  name: string;
  description: string;
  image?: string;
  services: Array<{
    name: string;
    endpoint: string;
    version?: string;
    skills?: string[];
    domains?: string[];
  }>;
  x402Support?: boolean;
  active?: boolean;
  supportedTrust?: string[];
}

export interface AttestationRequest {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  responsePath: string;
}

export interface AttestationResult {
  proofHash: string;
  requestHash: string;
  timestamp: number;
  data: any;
  primusProof: string;
}

export interface FeedbackInput {
  value: number;
  valueDecimals?: number;
  tag1?: string;
  tag2?: string;
  endpoint?: string;
  feedbackURI?: string;
  feedbackHash?: string;
}

// ============================================================
// Veritas SDK - ERC-8004 Compliant
// ============================================================

export class VeritasSDK {
  private provider: ethers.providers.Provider;
  private signer?: ethers.Signer;
  private primus: PrimusCoreTLS;
  private network: 'mainnet' | 'sepolia';
  
  // ERC-8004 Registries
  public identityRegistry: ethers.Contract;
  public reputationRegistry: ethers.Contract;
  public validationRegistry: ethers.Contract;

  constructor(config: VeritasConfig) {
    this.provider = config.provider;
    this.signer = config.signer;
    this.network = config.network || 'mainnet';
    this.primus = new PrimusCoreTLS();
    
    const addresses = this.network === 'mainnet' ? BASE_MAINNET : BASE_SEPOLIA;
    const signerOrProvider = config.signer || config.provider;
    
    // Connect to official ERC-8004 Identity Registry
    this.identityRegistry = new ethers.Contract(
      addresses.identityRegistry,
      IDENTITY_REGISTRY_ABI,
      signerOrProvider
    );
    
    // Connect to official ERC-8004 Reputation Registry
    this.reputationRegistry = new ethers.Contract(
      addresses.reputationRegistry,
      REPUTATION_REGISTRY_ABI,
      signerOrProvider
    );
    
    // Connect to Veritas Validation Registry (Primus zkTLS enabled)
    this.validationRegistry = new ethers.Contract(
      config.validationRegistryAddress || addresses.validationRegistry,
      VALIDATION_REGISTRY_ABI,
      signerOrProvider
    );
  }

  // Initialize Primus SDK
  async initialize(): Promise<void> {
    await this.primus.init();
  }

  // ============================================================
  // IDENTITY REGISTRY (ERC-8004)
  // ============================================================

  /**
   * Register a new agent on ERC-8004 Identity Registry
   * @param registration Agent registration data
   * @returns agentId The assigned agent ID
   */
  async registerAgent(registration: AgentRegistration): Promise<number> {
    if (!this.signer) throw new Error('Signer required for registration');
    
    // Build ERC-8004 compliant registration file
    const registrationFile = {
      type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
      name: registration.name,
      description: registration.description,
      image: registration.image || '',
      services: registration.services,
      x402Support: registration.x402Support || false,
      active: registration.active !== false,
      registrations: [], // Will be populated after registration
      supportedTrust: registration.supportedTrust || ['reputation', 'crypto-economic']
    };
    
    // Convert to URI (IPFS recommended, or data URI for small files)
    const agentURI = `data:application/json;base64,${Buffer.from(JSON.stringify(registrationFile)).toString('base64')}`;
    
    // Register on-chain
    const tx = await this.identityRegistry.register(agentURI);
    const receipt = await tx.wait();
    
    // Parse agentId from event
    const event = receipt.events?.find((e: any) => e.event === 'Registered');
    const agentId = event?.args?.agentId?.toNumber();
    
    return agentId;
  }

  /**
   * Get agent owner
   */
  async getAgentOwner(agentId: number): Promise<string> {
    return this.identityRegistry.ownerOf(agentId);
  }

  /**
   * Get agent registration URI
   */
  async getAgentURI(agentId: number): Promise<string> {
    return this.identityRegistry.tokenURI(agentId);
  }

  /**
   * Get agent wallet address
   */
  async getAgentWallet(agentId: number): Promise<string> {
    return this.identityRegistry.getAgentWallet(agentId);
  }

  /**
   * Update agent URI
   */
  async setAgentURI(agentId: number, newURI: string): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error('Signer required');
    return this.identityRegistry.setAgentURI(agentId, newURI);
  }

  // ============================================================
  // REPUTATION REGISTRY (ERC-8004)
  // ============================================================

  /**
   * Submit feedback for an agent
   * @param agentId Agent being reviewed
   * @param feedback Feedback data
   */
  async giveFeedback(agentId: number, feedback: FeedbackInput): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error('Signer required for feedback');
    
    const valueDecimals = feedback.valueDecimals || 0;
    const value = Math.floor(feedback.value * Math.pow(10, valueDecimals));
    
    return this.reputationRegistry.giveFeedback(
      agentId,
      value,
      valueDecimals,
      feedback.tag1 || '',
      feedback.tag2 || '',
      feedback.endpoint || '',
      feedback.feedbackURI || '',
      feedback.feedbackHash || ethers.constants.HashZero
    );
  }

  /**
   * Get reputation summary for an agent
   * @param agentId Agent to check
   * @param clientAddresses Filter by specific reviewers (empty for all)
   * @param tag1 Optional tag filter
   * @param tag2 Optional tag filter
   */
  async getReputationSummary(
    agentId: number,
    clientAddresses: string[] = [],
    tag1?: string,
    tag2?: string
  ): Promise<{ count: number; averageValue: number; decimals: number }> {
    const [count, summaryValue, decimals] = await this.reputationRegistry.getSummary(
      agentId,
      clientAddresses,
      tag1 || '',
      tag2 || ''
    );
    
    return {
      count: count.toNumber(),
      averageValue: summaryValue.toNumber() / Math.pow(10, decimals),
      decimals: decimals
    };
  }

  // ============================================================
  // VALIDATION REGISTRY (ERC-8004 + Primus zkTLS)
  // ============================================================

  /**
   * Request validation from a validator
   * @param validatorAddress Address of authorized validator
   * @param agentId Agent to validate
   * @param requestURI URI to validation request data
   */
  async requestValidation(
    validatorAddress: string,
    agentId: number,
    requestURI: string
  ): Promise<string> {
    if (!this.signer) throw new Error('Signer required');
    
    const requestHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(`${agentId}-${Date.now()}-${requestURI}`)
    );
    
    const tx = await this.validationRegistry.validationRequest(
      validatorAddress,
      agentId,
      requestURI,
      requestHash
    );
    await tx.wait();
    
    return requestHash;
  }

  /**
   * Generate and submit Primus zkTLS attestation
   * @param agentId Agent being attested
   * @param request Attestation request details
   */
  async generateAttestation(agentId: number, request: AttestationRequest): Promise<AttestationResult> {
    if (!this.signer) throw new Error('Signer required');
    
    // Generate zkTLS proof via Primus
    const attestation = await this.primus.generateAttestation({
      url: request.url,
      method: request.method,
      headers: request.headers || {},
      body: request.body,
      responseParsePath: request.responsePath
    });
    
    // Create proof hash
    const proofHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(JSON.stringify(attestation.proof))
    );
    
    // Create request URI with attestation data
    const requestData = {
      url: request.url,
      method: request.method,
      timestamp: Date.now(),
      responsePath: request.responsePath
    };
    const requestURI = `data:application/json;base64,${Buffer.from(JSON.stringify(requestData)).toString('base64')}`;
    
    // Submit to Validation Registry
    const tx = await this.validationRegistry.submitPrimusAttestation(
      agentId,
      proofHash,
      request.url,
      attestation.proof,
      requestURI
    );
    const receipt = await tx.wait();
    
    // Parse requestHash from event
    const event = receipt.events?.find((e: any) => e.event === 'ValidationRequest');
    const requestHash = event?.args?.requestHash;
    
    return {
      proofHash,
      requestHash,
      timestamp: Date.now(),
      data: attestation.data,
      primusProof: attestation.proof
    };
  }

  /**
   * Verify an attestation is valid
   * @param requestHash The validation request hash
   */
  async verifyAttestation(requestHash: string): Promise<{
    isValid: boolean;
    agentId: number;
    validator: string;
    response: number;
    timestamp: number;
  }> {
    const status = await this.validationRegistry.getValidationStatus(requestHash);
    
    return {
      isValid: status.response > 0,
      agentId: status.agentId.toNumber(),
      validator: status.validatorAddress,
      response: status.response,
      timestamp: status.lastUpdate.toNumber()
    };
  }

  /**
   * Get all validations for an agent
   */
  async getAgentValidations(agentId: number): Promise<string[]> {
    return this.validationRegistry.getAgentValidations(agentId);
  }

  // ============================================================
  // MOLTCOOK-SPECIFIC HELPERS
  // ============================================================

  /**
   * Verify Moltbook agent X/Twitter ownership
   * @param agentId The registered agent ID
   * @param twitterHandle Twitter handle to verify
   */
  async verifyMoltbookTwitter(agentId: number, twitterHandle: string): Promise<AttestationResult> {
    return this.generateAttestation(agentId, {
      url: `https://api.twitter.com/2/users/by/username/${twitterHandle}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
      },
      responsePath: '$.data.id'
    });
  }

  /**
   * Verify Moltbook agent profile ownership
   * @param agentId The registered agent ID
   * @param moltbookName Moltbook agent name
   */
  async verifyMoltbookProfile(agentId: number, moltbookName: string): Promise<AttestationResult> {
    return this.generateAttestation(agentId, {
      url: `https://www.moltbook.com/api/v1/agents/${moltbookName}`,
      method: 'GET',
      responsePath: '$.agent.wallet_address'
    });
  }
}

export default VeritasSDK;
