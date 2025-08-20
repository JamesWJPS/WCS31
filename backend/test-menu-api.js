const axios = require('axios');

async function testMenuAPI() {
  try {
    console.log('Testing menu API endpoint...');
    
    // First, let's try to get content to see if we have any
    console.log('\n1. Getting content list...');
    const contentResponse = await axios.get('http://localhost:3001/api/content', {
      headers: {
        'Authorization': 'Bearer your-token-here' // This will likely fail without a real token
      }
    });
    
    console.log('Content response:', contentResponse.status);
    
  } catch (error) {
    console.error('Error details:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testMenuAPI();