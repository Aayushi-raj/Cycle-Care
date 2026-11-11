const app = require('./src/app');
const http = require('http');

async function runIntegrationTest() {
  const PORT = 5055;
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Test Express server listening on http://localhost:${PORT}`);

  try {
    console.log('\n--- Test 1: POST /api/ai/symptom-analysis ---');
    const res1 = await fetch(`http://localhost:${PORT}/api/ai/symptom-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'My stomach hurts during periods' }),
    });
    console.log('Status 1:', res1.status);
    const data1 = await res1.json();
    console.log('Input:', data1.input_text);
    console.log('Top match:', data1.detected_symptoms?.[0]?.name, 'Confidence:', data1.detected_symptoms?.[0]?.confidence);
    if (!data1.detected_symptoms?.some(s => s.symptom_id === 'cramps')) {
      throw new Error("Failed: 'cramps' not found in detected symptoms!");
    }

    console.log('\n--- Test 2: GET /api/ai/semantic-search ---');
    const res2 = await fetch(`http://localhost:${PORT}/api/ai/semantic-search?q=what+foods+help+with+severe+cramps`);
    console.log('Status 2:', res2.status);
    const data2 = await res2.json();
    console.log('Results count:', data2.total_results);
    console.log('First result title:', data2.results?.[0]?.title, 'Score:', data2.results?.[0]?.relevance_score);
    if (!data2.results || data2.results.length === 0) {
      throw new Error('Failed: No semantic search results returned!');
    }

    console.log('\n--- Test 3: POST /api/ai/recommendations ---');
    const res3 = await fetch(`http://localhost:${PORT}/api/ai/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'My stomach hurts during periods',
        phase: 'menstrual',
      }),
    });
    console.log('Status 3:', res3.status);
    const data3 = await res3.json();
    console.log('Nutrition guidance count:', data3.nutrition_guidance?.length);
    console.log('First nutrient:', data3.nutrition_guidance?.[0]?.name);
    console.log('Disclaimer present:', !!data3.medical_disclaimer);
    if (!data3.nutrition_guidance || data3.nutrition_guidance.length === 0) {
      throw new Error('Failed: No nutrition guidance returned!');
    }

    console.log('\n--- Test 4: GET /api/ai/graph/explore ---');
    const res4 = await fetch(`http://localhost:${PORT}/api/ai/graph/explore`);
    console.log('Status 4:', res4.status);
    const data4 = await res4.json();
    console.log('Nodes count:', data4.nodes?.length, 'Links count:', data4.links?.length);
    if (!data4.nodes || data4.nodes.length === 0) {
      throw new Error('Failed: Graph nodes missing!');
    }

    console.log('\n🎉 ALL EXPRESS -> AI SERVICE INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n');
  } finally {
    server.close();
  }
}

runIntegrationTest().catch(err => {
  console.error('Integration test failed:', err);
  process.exit(1);
});

