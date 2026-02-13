import { ethers } from 'ethers';
import { PrimusNetwork } from '@primuslabs/network-core-sdk';

// ============================================================
// ERC-8004 Official Contract Addresses on Base
// ============================================================
const BASE_MAINNET = {
  identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
  validationRegistry: '0x0000000000000000000000000000000000000000'
};

const BASE_SEPOLIA = {
  identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  validationRegistry: '0x0000000000000000000000000000000000000000'
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

const VALIDATION_REGISTRY_ABI = [
  "function initialize(address identityRegistry_) external",
  "function getIdentityRegistry() external view returns (address)",
  "function validationRequest(address validatorAddress, uint256 agentId, string calldata requestURI, bytes32 requestHash) external",
  "function validationResponse(bytes32 requestHash, uint8 response, string calldata responseURI, bytes32 responseHash, string calldata tag) external",
  "function submitPrimusAttestation(uint256 agentId, bytes32 proofHash, string calldata apiEndpoint, bytes calldata primusProof, string calldata requestURI) external returns (bytes32)",
  "function getValidationStatus(bytes32 requestHash) external view returns (address validatorAddress, uint256 agentId, uint8 response, bytes32 responseHash, string tag, uint256 lastUpdate)",
  "function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory)"
];

// ============================================================
// TypeScript Interfaces
// ============================================================
export interface VeritasConfig {
  provider: ethers.providers.Provider;
  signer: ethers.Signer; // Required for Network SDK
  network?: 'mainnet' | 'sepolia';
  validationRegistryAddress?: string;
  chainId?: number;
  rpcUrl?: string;
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
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  extracts: Array<{ key: string; path: string }>;
  mode?: 'proxytls' | 'standard';
}

export interface AttestationResult {
  requestHash: string;
  taskId: string;
  timestamp: number;
  data: Record<string, any>;
  proof: string;
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
// Veritas SDK - ERC-8004 + Primus Network SDK
// ============================================================

export class VeritasSDK {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private primusNetwork: PrimusNetwork;
  private network: 'mainnet' | 'sepolia';
  private chainId: number;
  private walletAddress: string = '';
  
  public identityRegistry: ethers.Contract;
  public reputationRegistry: ethers.Contract;
  public validationRegistry: ethers.Contract;

  constructor(config: VeritasConfig) {
    if (!config.signer) {
      throw new Error('Signer is required for Network SDK');
    }
    
    this.provider = config.provider;
    this.signer = config.signer;
    this.network = config.network || 'mainnet';
    
    // Network-specific chain IDs
    this.chainId = config.chainId || (this.network === 'mainnet' ? 8453 : 84532);
    
    this.primusNetwork = new PrimusNetwork();
    
    const addresses = this.network === 'mainnet' ? BASE_MAINNET : BASE_SEPOLIA;
    
    this.identityRegistry = new ethers.Contract(
      addresses.identityRegistry,
      IDENTITY_REGISTRY_ABI,
      this.signer
    );
    
    this.reputationRegistry = new ethers.Contract(
      addresses.reputationRegistry,
      REPUTATION_REGISTRY_ABI,
      this.signer
    );
    
    this.validationRegistry = new ethers.Contract(
      config.validationRegistryAddress || addresses.validationRegistry,
      VALIDATION_REGISTRY_ABI,
      this.signer
    );
  }

  /**
   * Initialize Primus Network SDK with wallet
   */
  async initialize(): Promise<void> {
    this.walletAddress = await this.signer.getAddress();
    await this.primusNetwork.init(this.signer, this.chainId);
  }

  // ============================================================
  // IDENTITY REGISTRY (ERC-8004)
  // ============================================================

  async registerAgent(registration: AgentRegistration): Promise<number> {
    const registrationFile = {
      type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
      name: registration.name,
      description: registration.description,
      image: registration.image || '',
      services: registration.services,
      x402Support: registration.x402Support || false,
      active: registration.active !== false,
      registrations: [],
      supportedTrust: registration.supportedTrust || ['reputation', 'crypto-economic']
    };
    
    const agentURI = `data:application/json;base64,${Buffer.from(JSON.stringify(registrationFile)).toString('base64')}`;
    
    const tx = await this.identityRegistry.register(agentURI);
    const receipt = await tx.wait();
    
    const event = receipt.events?.find((e: any) => e.event === 'Registered');
    const agentId = event?.args?.agentId?.toNumber();
    
    return agentId;
  }

  async getAgentOwner(agentId: number): Promise<string> {
    return this.identityRegistry.ownerOf(agentId);
  }

  async getAgentURI(agentId: number): Promise<string> {
    return this.identityRegistry.tokenURI(agentId);
  }

  // ============================================================
  // REPUTATION REGISTRY (ERC-8004)
  // ============================================================

  async giveFeedback(agentId: number, feedback: FeedbackInput): Promise<ethers.ContractTransaction> {
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
  // VALIDATION REGISTRY (ERC-8004 + Primus Network)
  // ============================================================

  /**
   * Generate attestation using Primus Network SDK (decentralized)
   * @param agentId Agent being validated
   * @param request Attestation request
   */
  async generateAttestation(agentId: number, request: AttestationRequest): Promise<AttestationResult> {
    // Submit task to Primus Network
    const submitTaskResult = await this.primusNetwork.submitTask({
      address: this.walletAddress
    });

    // Build request
    const primusRequest = {
      url: request.url,
      method: request.method || 'GET',
      header: request.headers || {},
      body: request.body || ''
    };

    // Build response resolves for data extraction
    const responseResolves = request.extracts.map(e => ({
      keyName: e.key,
      parseType: 'json' as const,
      parsePath: e.path
    }));

    // Generate attestation
    const generateAttestationRes = await this.primusNetwork.generateAttestation(
      submitTaskResult,
      [primusRequest],
      responseResolves,
      request.mode || 'proxytls'
    );

    // Get attestation result
    const attestationResult = await this.primusNetwork.getAttestation(
      submitTaskResult.taskId,
      3, // retryCount
      10000 // timeout ms
    );

    // Create request hash for on-chain storage
    const requestHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(`${agentId}-${attestationResult.taskId}-${Date.now()}`)
    );

    // Create proof data
    const proof = JSON.stringify({
      taskId: attestationResult.taskId,
      attestation: attestationResult.attestation,
      recipient: attestationResult.recipient,
      timestamp: Date.now()
    });

    // Extract data
    const extractedData: Record<string, any> = {};
    if (attestationResult.attestation?.content) {
      request.extracts.forEach(e => {
        extractedData[e.key] = this.extractValue(
          JSON.parse(attestationResult.attestation.content),
          e.path
        );
      });
    }

    // Store on-chain
    const tx = await this.validationRegistry.submitPrimusAttestation(
      agentId,
      requestHash,
      request.url,
      ethers.utils.toUtf8Bytes(proof),
      `data:application/json;base64,${Buffer.from(JSON.stringify(primusRequest)).toString('base64')}`
    );
    await tx.wait();

    return {
      requestHash,
      taskId: attestationResult.taskId,
      timestamp: Date.now(),
      data: extractedData,
      proof
    };
  }

  private extractValue(obj: any, path: string): any {
    const parts = path.replace(/^\$\./, '').split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }

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

  async getAgentValidations(agentId: number): Promise<string[]> {
    return this.validationRegistry.getAgentValidations(agentId);
  }

  // ============================================================
  // MOLTBOOK HELPERS
  // ============================================================

  /**
   * Verify Moltbook agent ownership via Moltbook API
   * This proves the agent's registered owner matches the wallet creating the attestation
   * @param agentId The registered agent ID
   * @param moltbookName Moltbook agent name (e.g., 'CilohPrimus')
   */
  async verifyMoltbookOwnership(agentId: number, moltbookName: string): Promise<{
    attestation: AttestationResult;
    ownerMatch: boolean;
    extractedOwner: string;
  }> {
    // Generate attestation from Moltbook API
    const attestation = await this.generateAttestation(agentId, {
      url: `https://www.moltbook.com/api/v1/agents/${moltbookName}`,
      method: 'GET',
      extracts: [
        { key: 'agentName', path: '$.agent.name' },
        { key: 'ownerAddress', path: '$.agent.wallet_address' },
        { key: 'moltbookAgentId', path: '$.agent.id' }
      ]
    });

    // Check if extracted owner matches registered wallet
    const extractedOwner = (attestation.data.ownerAddress || '').toLowerCase();
    const registeredOwner = this.walletAddress.toLowerCase();
    const ownerMatch = extractedOwner === registeredOwner;

    return {
      attestation,
      ownerMatch,
      extractedOwner
    };
  }
}

export default VeritasSDK;
