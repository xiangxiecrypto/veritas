const hre = require("hardhat");
const { ethers } = hre;
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
const MOLTBOOK_API = 'https://www.moltbook.com/api/v1/agents/profile?name=CilohPrimus';
const CHAIN_ID = 84532;

async function main() {
  console.log('\n🔍 Debugging ResponseResolve\n');
  
  const [wallet] = await ethers.getSigners();
  
  const primus = new PrimusNetwork();
  await primus.init(wallet, CHAIN_ID);
  
  // Get attestation
  const result = await primus.attest({
    address: wallet.address,
    taskId: "0x105be136a7e61b166beb563dd86f22ac5d9fadca5680d12b29d2bfc8c44b9702",
    taskTxHash: "0xe1cea45e21b46126d58521034ca686ace75212b4b4f9c16343aa4cbe13ae3e0b",
    taskAttestors: ['0x0DE886e31723e64Aa72e51977B14475fB66a9f72'],
    requests: [{
      url: MOLTBOOK_API,
      method: "GET",
      header: {},
      body: ""
    }],
    responseResolves: [[{
      keyName: "x_follower_count",
      parseType: "json",
      parsePath: "$.agent.owner.x_follower_count"
    }]]
  }, 60000);
  
  const att = result[0].attestation;
  
  console.log('Request (URL):');
  console.log('  ', att.request);
  console.log('  Hex:', ethers.utils.hexlify(att.request));
  
  console.log('\nResponseResolve:');
  console.log('  ', att.responseResolve);
  console.log('  Hex:', ethers.utils.hexlify(att.responseResolve));
  
  console.log('\nData:');
  console.log('  ', att.data);
}

main().catch(console.error);
