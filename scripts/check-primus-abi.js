const axios = require('axios');

async function main() {
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  
  try {
    // Try to fetch ABI from Basescan
    const response = await axios.get(`https://api-sepolia.basescan.org/api?module=contract&action=getabi&address=${PRIMUS_TASK}`);
    
    if (response.data.status === '1') {
      const abi = JSON.parse(response.data.result);
      
      // Find Attestation struct
      const attestationStruct = abi.find(item => 
        item.type === 'struct' && item.name.includes('Attestation')
      );
      
      if (attestationStruct) {
        console.log('Attestation struct:');
        attestationStruct.members.forEach(m => {
          console.log(`  ${m.type} ${m.name}`);
        });
      }
      
      // Also check for queryTask function
      const queryTask = abi.find(item => 
        item.type === 'function' && item.name === 'queryTask'
      );
      
      if (queryTask) {
        console.log('\nqueryTask output:');
        queryTask.outputs.forEach(o => {
          if (o.components) {
            console.log(`  ${o.type} ${o.name || ''}:`);
            o.components.forEach(c => console.log(`    ${c.type} ${c.name}`));
          }
        });
      }
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

main();
