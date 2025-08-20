const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testMenuIntegration() {
  try {
    console.log('Testing menu integration...');
    
    // First, let's get the current content to see what we have
    console.log('\n1. Getting current content...');
    const contentResponse = await axios.get(`${API_BASE}/content`, {
      headers: {
        'Authorization': 'Bearer test-token' // You'll need a valid token
      }
    });
    
    console.log('Current content items:', contentResponse.data.length);
    
    if (contentResponse.data.length === 0) {
      console.log('No content items found. Please create some content first.');
      return;
    }
    
    // Test the bulk update menu order endpoint
    console.log('\n2. Testing bulk update menu order...');
    const updates = contentResponse.data.map((item, index) => ({
      id: item.id,
      menu_order: index,
      parent_id: null,
      show_in_menu: true
    }));
    
    const updateResponse = await axios.post(`${API_BASE}/content/bulk-update-menu`, {
      updates
    }, {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Bulk update response:', updateResponse.status);
    
    // Verify the updates were applied
    console.log('\n3. Verifying updates...');
    const verifyResponse = await axios.get(`${API_BASE}/content`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('Updated content items:');
    verifyResponse.data.forEach(item => {
      console.log(`- ${item.title}: order=${item.menu_order}, show_in_menu=${item.show_in_menu}`);
    });
    
    console.log('\n✅ Menu integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Menu integration test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testMenuIntegration();