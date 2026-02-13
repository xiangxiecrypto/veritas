import { ethers } from 'ethers';
import { PrimusCoreTLS } from '@primuslabs/zktls-core-sdk';

// Contract ABIs (simplified)
const IDENTITY_REGISTRY_ABI = [
  "function registerIdentity(bytes32 identityHash) external",
  "function verifyIdentity(address account) external view returns (bool)",
  "function getIdentity(address account) external view returns (bytes32, uint256)"
];

const VALIDATION_REGISTRY_ABI = [
  "function storeValidation(bytes32 attestationHash, bytes calldata proof) external",
  "function validate(address account, bytes32 attestationHash) external view returns (bool)",
  "function getValidation(address account, bytes32 attestationHash) external view returns (Validation memory)"
];

// Base Mainnet Addresses
const CONTRACTS = {
  identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
  validationRegistry: '0x0000000000000000000000000000000000000000' // Deploy yours
};

export interface VeritasConfig {
  provider: ethers.providers.Provider;
  signer?: ethers.Signer;
  validationRegistryAddress?: string;
}

export interface AttestationRequest {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  responsePath: string; // JSON path to extract
}

export interface AttestationResult {
  attestationHash: string;
  proof: string;
  timestamp: number;
  data: any;
}

export class VeritasSDK {
  private provider: ethers.providers.Provider;
  private signer?: ethers.Signer;
  private primus: PrimusCoreTLS;
  private identityRegistry: ethers.Contract;
  private validationRegistry?: ethers.Contract;

  constructor(config: VeritasConfig) {
    this.provider = config.provider;
    this.signer = config.signer;
    this.primus = new PrimusCoreTLS();
    
    this.identityRegistry = new ethers.Contract(
      CONTRACTS.identityRegistry,
      IDENTITY_REGISTRY_ABI,
      config.signer || config.provider
    );

    if (config.validationRegistryAddress) {
      this.validationRegistry = new ethers.Contract(
        config.validationRegistryAddress,
        VALIDATION_REGISTRY_ABI,
        config.signer || config.provider
      );
    }
  }

  // Initialize Primus SDK
  async initialize(): Promise<void> {
    await this.primus.init();
  }

  // Register agent identity on-chain
  async registerIdentity(identityData: Record<string, any>): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error('Signer required for registration');
    
    const identityHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(JSON.stringify(identityData))
    );
    
    return this.identityRegistry.registerIdentity(identityHash);
  }

  // Check if identity is registered
  async verifyIdentity(address: string): Promise<boolean> {
    return this.identityRegistry.verifyIdentity(address);
  }

  // Generate zkTLS attestation for any API
  async generateAttestation(request: AttestationRequest): Promise<AttestationResult> {
    // Build attestation request for Primus
    const attestation = await this.primus.generateAttestation({
      url: request.url,
      method: request.method,
      headers: request.headers || {},
      body: request.body,
      responseParsePath: request.responsePath
    });

    const attestationHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(attestation.proof)
    );

    return {
      attestationHash,
      proof: attestation.proof,
      timestamp: Date.now(),
      data: attestation.data
    };
  }

  // Store attestation on-chain for verification
  async storeAttestation(result: AttestationResult): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error('Signer required to store validation');
    if (!this.validationRegistry) throw new Error('Validation registry not configured');

    return this.validationRegistry.storeValidation(
      result.attestationHash,
      result.proof
    );
  }

  // Verify an attestation is stored on-chain
  async verifyAttestation(address: string, attestationHash: string): Promise<boolean> {
    if (!this.validationRegistry) throw new Error('Validation registry not configured');
    
    return this.validationRegistry.validate(address, attestationHash);
  }

  // Twitter/X ownership verification helper
  async verifyTwitterOwnership(
    twitterHandle: string,
    agentAddress: string
  ): Promise<AttestationResult> {
    return this.generateAttestation({
      url: `https://api.twitter.com/2/users/by/username/${twitterHandle}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
      },
      responsePath: '$.data.id'
    });
  }

  // Moltbook agent verification helper
  async verifyMoltbookAgent(
    agentName: string
  ): Promise<AttestationResult> {
    return this.generateAttestation({
      url: `https://www.moltbook.com/api/v1/agents/${agentName}`,
      method: 'GET',
      responsePath: '$.agent.wallet_address'
    });
  }
}

export default VeritasSDK;
