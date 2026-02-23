const hre = require("hardhat");
const { ethers } = hre;

const APP = "0x68c75b005C651D829238938d61bB25D75Cc4643E";
const taskId = "0x8fb6cda8019a8322b01f74714ee4a73a862277d19f710d21229a1a2f1ef34d32";

async function main() {
  console.log('\n📦 Submitting Attestation...\n');
  
  const [wallet] = await ethers.getSigners();
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const gasPrice = await ethers.provider.getGasPrice();
  
  try {
    const submitTx = await app.submitAttestation(taskId, {
      gasPrice: gasPrice.mul(3),
      gasLimit: 500000
    });
    const receipt = await submitTx.wait();
    
    console.log('Tx:', submitTx.hash);
    console.log('Block:', receipt.blockNumber);
    
    const completedEvent = receipt.events.find(e => e.event === 'ValidationCompleted');
    if (completedEvent) {
      console.log('\n✅ SUCCESS!');
      console.log('Task ID:', completedEvent.args.taskId);
      console.log('Score:', completedEvent.args.score.toString());
    }
    
    // Check for CheckPassed/CheckFailed events
    const passedEvents = receipt.events.filter(e => e.event === 'CheckPassed');
    const failedEvents = receipt.events.filter(e => e.event === 'CheckFailed');
    
    if (passedEvents.length > 0) {
      console.log('\nChecks Passed:', passedEvents.length);
    }
    if (failedEvents.length > 0) {
      console.log('\nChecks Failed:', failedEvents.length);
    }
    
  } catch (error) {
    console.log('Error:', error.reason || error.message);
  }
}

main().catch(console.error);
