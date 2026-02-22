import { ethers } from 'ethers';

// ============================================================
// Veritas Protocol SDK
// Build trust for AI agents with ERC-8004 + Primus zkTLS
// ============================================================

// Contract Addresses (Base Sepolia)
const ADDRESSES = {
  sepolia: {
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
    primusTask: '0xC02234058caEaA9416506eABf6Ef3122fCA939E8'
  },
  mainnet: {
    identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
    primusTask: '0x0000000000000000000000000000000000000000' // TBD
  }
};

// Minimal ABIs for direct interaction
const IDENTITY_REGISTRY_ABI = [
  "function register(string agentURI) external returns (uint256 agentId)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)"
];

const VALIDATION_REGISTRY_ABI = [
  "function validationRequest(address validatorAddress, uint256 agentId, string calldata requestURI, bytes32 requestHash) external",
  "function validationResponse(bytes32 requestHash, uint8 response, string calldata responseURI, bytes32 responseHash, string calldata tag) external",
  "function getValidationStatus(bytes32 requestHash) external view returns (address validatorAddress, uint256 agentId, uint8 response, bytes32 responseHash, string tag, uint256 lastUpdate)",
  "function getSummary(uint256 agentId, address[] calldata validatorAddresses, string tag) external view returns (uint64 count, uint8 averageResponse)",
  "function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory)",
  "event ValidationRequest(address indexed validatorAddress, uint256 indexed agentId, string requestURI, bytes32 indexed requestHash)",
  "event ValidationResponse(address indexed validatorAddress, uint256 indexed agentId, bytes32 indexed requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag)"
];

const TASK_ABI = [
  "function queryLatestFeeInfo(uint8) view returns (tuple(uint256 primusFee, uint256 attestorFee))",
  "function submitTask(address,string,uint256,uint8,address) payable returns (bytes32)",
  "event TaskSubmitted(bytes32,address,string)"
];

// Types
export interface AgentRegistration {
  name: string;
  description: string;
  image?: string;
  services?: Array<{
    name: string;
    endpoint: string;
    capabilities?: string[];
  }>;
}

export interface ValidationRule {
  templateId: string;  // URL to fetch data from
  dataKey: string;     // Key name for the data
  parsePath: string;   // JSON path to extract value (e.g., "$.data.rates.USD")
  decimals: number;
  maxAge: number;
  description: string;
}

export interface ReputationSummary {
  count: number;
  averageResponse: number;
}

// ============================================================
// Veritas SDK
// ============================================================

export class VeritasSDK {
  private signer: ethers.Signer;
  private provider: ethers.providers.Provider;
  private network: 'sepolia' | 'mainnet';
  
  identityRegistry: ethers.Contract;
  validationRegistry: ethers.Contract;
  primusTask: ethers.Contract;
  
  constructor(config: {
    signer: ethers.Signer;
    provider?: ethers.providers.Provider;
    network?: 'sepolia' | 'mainnet';
  }) {
    this.signer = config.signer;
    this.provider = config.provider || config.signer.provider!;
    this.network = config.network || 'sepolia';
    
    const addresses = ADDRESSES[this.network];
    
    this.identityRegistry = new ethers.Contract(
      addresses.identityRegistry,
      IDENTITY_REGISTRY_ABI,
      this.signer
    );
    
    // Note: ValidationRegistry address comes from PrimusVeritasApp
    this.validationRegistry = new ethers.Contract(
      ethers.constants.AddressZero, // Will be set when app is deployed
      VALIDATION_REGISTRY_ABI,
      this.signer
    );
    
    this.primusTask = new ethers.Contract(
      addresses.primusTask,
      TASK_ABI,
      this.signer
    );
  }
  
  /**
   * Register a new agent
   */
  async registerAgent(agent: AgentRegistration): Promise<number> {
    const agentURI = `data:application/json;base64,${Buffer.from(JSON.stringify({
      type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
      name: agent.name,
      description: agent.description,
      image: agent.image || "",
      services: agent.services || [],
      supportedTrust: ["reputation", "primus-zktls"]
    })).toString('base64')}`;
    
    const tx = await this.identityRegistry.register(agentURI);
    const receipt = await tx.wait();
    
    const event = receipt.events?.find((e: any) => e.event === 'Registered');
    if (!event) throw new Error('Registration failed');
    
    return event.args.agentId.toNumber();
  }
  
  /**
   * Get agent owner
   */
  async getAgentOwner(agentId: number): Promise<string> {
    return this.identityRegistry.ownerOf(agentId);
  }
  
  /**
   * Query fee for validation
   */
  async getValidationFee(attestorCount: number = 1): Promise<ethers.BigNumber> {
    const feeInfo = await this.primusTask.queryLatestFeeInfo(0); // 0 = ETH
    return feeInfo.primusFee.add(feeInfo.attestorFee.mul(attestorCount));
  }
  
  /**
   * Submit task directly to TaskContract (bypasses SDK bug)
   * This is the KEY function that makes callback work!
   */
  async submitTaskDirect(
    callbackAddress: string,
    templateId: string = "",
    attestorCount: number = 1
  ): Promise<{ taskId: string; txHash: string }> {
    const fee = await this.getValidationFee(attestorCount);
    
    const tx = await this.primusTask.submitTask(
      await this.signer.getAddress(),  // sender
      templateId,                       // templateId
      attestorCount,                    // attestorCount
      0,                                // tokenSymbol (ETH)
      callbackAddress,                  // callback ← KEY!
      { value: fee }
    );
    
    const receipt = await tx.wait();
    
    // Parse taskId from event
    const iface = new ethers.utils.Interface(TASK_ABI);
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed.name === 'TaskSubmitted') {
          return {
            taskId: parsed.args[0],
            txHash: receipt.transactionHash
          };
        }
      } catch (e) {}
    }
    
    throw new Error('Failed to parse taskId');
  }
  
  /**
   * Get validation status
   */
  async getValidationStatus(requestHash: string): Promise<{
    validatorAddress: string;
    agentId: number;
    response: number;
    responseHash: string;
    tag: string;
    lastUpdate: number;
  }> {
    const status = await this.validationRegistry.getValidationStatus(requestHash);
    return {
      validatorAddress: status.validatorAddress,
      agentId: status.agentId.toNumber(),
      response: status.response,
      responseHash: status.responseHash,
      tag: status.tag,
      lastUpdate: status.lastUpdate.toNumber()
    };
  }
  
  /**
   * Get reputation summary for agent
   */
  async getReputation(
    agentId: number,
    validatorAddresses: string[] = [],
    tag: string = ""
  ): Promise<ReputationSummary> {
    const summary = await this.validationRegistry.getSummary(
      agentId,
      validatorAddresses,
      tag
    );
    return {
      count: summary.count,
      averageResponse: summary.averageResponse
    };
  }
  
  /**
   * Get all validations for an agent
   */
  async getAgentValidations(agentId: number): Promise<string[]> {
    return this.validationRegistry.getAgentValidations(agentId);
  }
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Create TaskContract instance for direct calls
 * This bypasses the Primus SDK bug!
 */
export function createTaskContract(
  provider: ethers.providers.Provider | ethers.Signer
): ethers.Contract {
  return new ethers.Contract(
    ADDRESSES.sepolia.primusTask,
    TASK_ABI,
    provider
  );
}

/**
 * Encode check parameters
 */
export function encodePriceRangeParams(
  min: number,
  max: number
): string {
  return ethers.utils.defaultAbiCoder.encode(
    ['int128', 'int128'],
    [min, max]
  );
}

export default VeritasSDK;
