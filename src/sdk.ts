import { ethers } from 'ethers';

// ============================================================
// Veritas Protocol - Build trust for AI agents with ERC-8004
// ============================================================

const BASE_MAINNET = {
  identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
  primusVeritasApp: '0x0000000000000000000000000000000000000000', // TBD
  primusTask: '0x0000000000000000000000000000000000000000' // TBD
};

const BASE_SEPOLIA = {
  identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  primusVeritasApp: '0xa70063A1970c9c10d0663610Fe7a02495548ba9b',
  primusTask: '0xC02234058caEaA9416506eABf6Ef3122fCA939E8'
};

// ============================================================
// ABIs
// ============================================================

const IDENTITY_REGISTRY_ABI = [
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function register(string agentURI) external returns (uint256 agentId)",
  "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)"
];

const PRIMUS_VERITAS_APP_ABI = [
  "function requestVerification(uint256 ruleId, uint256 agentId) external payable returns (bytes32 taskId)",
  "function rules(uint256) external view returns (bytes32 urlHash, string url, string dataKey, int128 score, uint8 decimals, uint256 maxAge, bool active, string description)",
  "function ruleCount() external view returns (uint256)",
  "function identityRegistry() external view returns (address)",
  "function reputationRegistry() external view returns (address)",
  "function primusTask() external view returns (address)",
  "event VerificationRequested(bytes32 indexed taskId, uint256 indexed ruleId, uint256 indexed agentId)",
  "event VerificationCompleted(bytes32 indexed taskId, uint256 indexed agentId, int128 score)"
];

const REPUTATION_REGISTRY_ABI = [
  "function getIdentityRegistry() external view returns (address)",
  "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string calldata tag1, string calldata tag2, string calldata endpoint, string calldata feedbackURI, bytes32 feedbackHash) external",
  "function getSummary(uint256 agentId, address[] calldata clientAddresses, string tag1, string tag2) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)"
];

// ============================================================
// Interfaces
// ============================================================

export interface VeritasConfig {
  provider: ethers.providers.Provider;
  signer: ethers.Signer;
  network?: 'mainnet' | 'sepolia';
  primusVeritasAppAddress?: string;
}

export interface AgentRegistration {
  name: string;
  description: string;
  image?: string;
  services?: Array<{
    name: string;
    endpoint: string;
  }>;
}

export interface VerificationRule {
  id: number;
  url: string;
  dataKey: string;
  score: number;
  maxAge: number;
  active: boolean;
  description: string;
}

export interface ReputationSummary {
  count: number;
  averageValue: number;
  decimals: number;
}

// ============================================================
// Veritas SDK
// ============================================================

export class VeritasSDK {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private network: 'mainnet' | 'sepolia';
  
  identityRegistry: ethers.Contract;
  reputationRegistry: ethers.Contract;
  primusVeritasApp: ethers.Contract;
  
  private walletAddress!: string;
  
  constructor(config: VeritasConfig) {
    this.provider = config.provider;
    this.signer = config.signer;
    this.network = config.network || 'sepolia';
    
    const addresses = this.network === 'mainnet' ? BASE_MAINNET : BASE_SEPOLIA;
    const appAddress = config.primusVeritasAppAddress || addresses.primusVeritasApp;
    
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
    
    this.primusVeritasApp = new ethers.Contract(
      appAddress,
      PRIMUS_VERITAS_APP_ABI,
      this.signer
    );
  }
  
  async initialize(): Promise<void> {
    this.walletAddress = await this.signer.getAddress();
  }
  
  // ============================================================
  // STEP 1: REGISTER IDENTITY (ERC-8004)
  // ============================================================
  
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
    const agentId = event?.args?.agentId?.toNumber();
    
    console.log(`✅ Agent registered with ID: ${agentId}`);
    return agentId;
  }
  
  async registerIdentity(name: string, description: string): Promise<number> {
    return this.registerAgent({ name, description });
  }
  
  async getAgentOwner(agentId: number): Promise<string> {
    return this.identityRegistry.ownerOf(agentId);
  }
  
  async isAgentOwner(agentId: number, address?: string): Promise<boolean> {
    const owner = await this.getAgentOwner(agentId);
    const checkAddress = address || this.walletAddress;
    return owner.toLowerCase() === checkAddress.toLowerCase();
  }
  
  async isAgentRegistered(agentId: number): Promise<boolean> {
    try {
      await this.identityRegistry.ownerOf(agentId);
      return true;
    } catch {
      return false;
    }
  }
  
  // ============================================================
  // STEP 2: BUILD REPUTATION (Primus Attestation)
  // ============================================================
  
  async requestVerification(agentId: number, ruleId: number = 0): Promise<string> {
    const isOwner = await this.isAgentOwner(agentId);
    if (!isOwner) {
      throw new Error(`Caller is not the owner of agent ${agentId}`);
    }
    
    const tx = await this.primusVeritasApp.requestVerification(ruleId, agentId, {
      value: ethers.utils.parseEther('0.00000001') // Primus fee
    });
    const receipt = await tx.wait();
    
    const event = receipt.events?.find((e: any) => e.event === 'VerificationRequested');
    const taskId = event?.args?.taskId;
    
    console.log(`✅ Verification requested for agent ${agentId}`);
    console.log(`   Task ID: ${taskId}`);
    return taskId;
  }
  
  async getVerificationRules(): Promise<VerificationRule[]> {
    const count = (await this.primusVeritasApp.ruleCount()).toNumber();
    const rules: VerificationRule[] = [];
    
    for (let i = 0; i < count; i++) {
      const rule = await this.primusVeritasApp.rules(i);
      rules.push({
        id: i,
        url: rule.url,
        dataKey: rule.dataKey,
        score: rule.score.toNumber(),
        maxAge: rule.maxAge.toNumber(),
        active: rule.active,
        description: rule.description
      });
    }
    
    return rules;
  }
  
  // ============================================================
  // COMPLETE FLOW
  // ============================================================
  
  async registerAndVerify(
    name: string, 
    description: string, 
    ruleId: number = 0
  ): Promise<{ agentId: number; taskId: string }> {
    console.log('📋 Step 1: Registering agent...');
    const agentId = await this.registerIdentity(name, description);
    
    console.log('\n📋 Step 2: Requesting verification...');
    const taskId = await this.requestVerification(agentId, ruleId);
    
    return { agentId, taskId };
  }
  
  // ============================================================
  // REPUTATION (ERC-8004)
  // ============================================================
  
  async getReputationSummary(
    agentId: number,
    clientAddresses: string[],
    tag1?: string,
    tag2?: string
  ): Promise<ReputationSummary> {
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
}

export default VeritasSDK;
