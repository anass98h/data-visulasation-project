// Test script for player performance calculation
const http = require('http');

// Fetch demo from backend
const demoId = 'fe8e72af-1adf-42a1-ad2c-2dfce0b626a5';

http.get(`http://0.0.0.0:8000/demo/${demoId}`, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    const result = JSON.parse(data);
    const demoData = result.data;

    console.log('=== Demo Data Summary ===');
    console.log('Rounds:', demoData.rounds.length);
    console.log('Players:', demoData.players.length);
    console.log('Kills:', demoData.kills.length);

    console.log('\n=== Players ===');
    demoData.players.forEach(p => {
      console.log(`- ${p.name} (${p.team}, ${p.side}): ${p.kills} kills`);
    });

    console.log('\n=== Sample Round ===');
    console.log(JSON.stringify(demoData.rounds[0], null, 2));

    console.log('\n=== Sample Kills ===');
    demoData.kills.slice(0, 5).forEach(k => {
      console.log(`Round tick ${k.tick}: ${k.attackerName} (${k.attackerSide}) killed ${k.victimName} (${k.victimSide})`);
    });

    // Calculate which round each kill belongs to
    console.log('\n=== Kill Distribution by Round ===');
    const roundKills = {};
    demoData.rounds.forEach(r => {
      roundKills[r.roundNum] = 0;
    });

    demoData.kills.forEach(k => {
      for (const round of demoData.rounds) {
        if (k.tick >= round.startTick && k.tick <= round.endTick) {
          roundKills[round.roundNum]++;
          break;
        }
      }
    });

    Object.keys(roundKills).sort((a, b) => a - b).forEach(roundNum => {
      console.log(`Round ${roundNum}: ${roundKills[roundNum]} kills`);
    });
  });
});
