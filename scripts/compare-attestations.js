// Compare the attestation data between BTC and Moltbook

const btcAttestation = {
  url: "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
  data: '{"btcPrice":"62989.735"}',
  keyName: "btcPrice",
  parsePath: "$.data.rates.USD"
};

const moltbookAttestation = {
  url: "https://www.moltbook.com/api/v1/agents/profile?name=CilohPrimus",
  data: '{"x_followers":"1121"}',
  keyName: "x_followers",
  parsePath: "$.agent.owner.x_follower_count"
};

console.log('=== SIZE COMPARISON ===\n');

console.log('BTC:');
console.log('  URL length:', btcAttestation.url.length);
console.log('  Data length:', btcAttestation.data.length);
console.log('  keyName length:', btcAttestation.keyName.length);
console.log('  parsePath length:', btcAttestation.parsePath.length);

console.log('\nMoltbook:');
console.log('  URL length:', moltbookAttestation.url.length);
console.log('  Data length:', moltbookAttestation.data.length);
console.log('  keyName length:', moltbookAttestation.keyName.length);
console.log('  parsePath length:', moltbookAttestation.parsePath.length);

console.log('\n=== TOTAL ENCODED SIZE ESTIMATE ===');

// Rough estimate
const btcSize = btcAttestation.url.length + btcAttestation.data.length + 
                btcAttestation.keyName.length + btcAttestation.parsePath.length;
const moltbookSize = moltbookAttestation.url.length + moltbookAttestation.data.length + 
                     moltbookAttestation.keyName.length + moltbookAttestation.parsePath.length;

console.log('BTC total:', btcSize, 'bytes');
console.log('Moltbook total:', moltbookSize, 'bytes');
console.log('Difference:', moltbookSize - btcSize, 'bytes');
