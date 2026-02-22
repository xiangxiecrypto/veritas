const hre = require("hardhat");

async function main() {
  const APP_ADDRESS = "0xA1ea3a656962574C3c6f7840de4e6C45FE26B8A0";
  const IDENTITY_REG = "0xDc561AccDF2BA01BaC83Aef694bBdEAE31A3Fe1F";
  const [signer] = await hre.ethers.getSigners();
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP_ADDRESS);
  
  console.log('PrimusVeritasApp:', APP_ADDRESS);
  console.log('Registry:', await app.registry());
  console.log('Primus Task:', await app.primusTask());
  
  // Check identity
  const Identity = await hre.ethers.getContractFactory("SimpleIdentityRegistry");
  const identity = Identity.attach(IDENTITY_REG);
  
  console.log('\nIdentity Registry:', IDENTITY_REG);
  console.log('Agent 0 owner:', await identity.ownerOf(0));
  console.log('Signer:', signer.address);
  console.log('Match:', (await identity.ownerOf(0)) === signer.address);
}

main().catch(console.error);
