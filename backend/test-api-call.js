async function testApiCall() {
  const fetch = (await import('node-fetch')).default;
  console.log('🧪 Testing API Call to bulk-update endpoint');
  
  const testData = {
    contents: [
      {
        id: 'content-1',
        menu_order: 25,
        parent_id: null
      }
    ]
  };
  
  console.log('📤 Sending data:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await fetch('http://localhost:3001/api/content/bulk-update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    console.log('📡 Response status:', response.status);
    
    const result = await response.json();
    console.log('📥 Response data:', JSON.stringify(result, null, 2));
    
    // Now check if the database was actually updated
    const checkResponse = await fetch('http://localhost:3001/api/content');
    const checkResult = await checkResponse.json();
    
    const content1 = checkResult.data.find(item => item.id === 'content-1');
    console.log('\n📋 Current content-1 state:');
    console.log(`   Menu Order: ${content1.menu_order}`);
    console.log(`   Parent ID: ${content1.parent_id}`);
    
    if (content1.menu_order === 25) {
      console.log('\n🎉 SUCCESS: API update worked!');
    } else {
      console.log('\n❌ FAILURE: API update did not work');
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

testApiCall();