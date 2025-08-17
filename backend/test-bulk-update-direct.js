async function testBulkUpdate() {
  const fetch = (await import('node-fetch')).default;
  console.log('🧪 Testing bulk update API...\n');

  // Test data - let's reorder some content
  const testData = {
    contents: [
      {
        id: 'content-1',
        menu_order: 1,
        parent_id: null
      },
      {
        id: 'content-2', 
        menu_order: 2,
        parent_id: null
      },
      {
        id: 'content-services',
        menu_order: 3,
        parent_id: null
      },
      {
        id: 'content-waste-management',
        menu_order: 1,
        parent_id: 'content-services'
      },
      {
        id: 'content-planning',
        menu_order: 2,
        parent_id: 'content-services'
      }
    ]
  };

  try {
    console.log('📤 Sending bulk update request...');
    console.log('Data:', JSON.stringify(testData, null, 2));

    const response = await fetch('http://localhost:3001/api/content/bulk-update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('\n📥 Response:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ Bulk update successful!');
    } else {
      console.log('❌ Bulk update failed:', result.error);
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

testBulkUpdate();