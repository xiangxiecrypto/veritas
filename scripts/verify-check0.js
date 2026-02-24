const hre = require("hardhat");

async function main() {
  const CHECK0 = "0x374bE654c08DE2C688f49d13E65b34C087e7e49E";
  
  const abi = [
    "function validate(bytes,string,string,string,string,string,bytes) view returns (bool)"
  ];
  
  const [signer] = await hre.ethers.getSigners();
  const check = new hre.ethers.Contract(CHECK0, abi, signer);
  
  try {
    const result = await check.validate(
      "0x", // bytes
      "0x", // string as bytes
      "test",
      "test",
      "test",
      "test",
      "0x"
    );
    console.log('Result:', result);
  } catch (e) {
    console.log('Error:', e.message);
  }
}

main().catch(console.error);
