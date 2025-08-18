const fetch = require('node-fetch');

async function testMenuUpdate() {
  const baseUrl = 'http://localhost:3001/api';
  
  try {
    // First, login to get a token
    console.log('Logging in...');
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      }),
    });

    const loginResult = await loginResponse.json();
    if (!loginResult.success) {
      console.error('Login failed:', loginResult.error);
      return;
    }

    const token = loginResult.data.token;
    console.log('Login successful');

    // Get current content to see structure
    console.log('\nFetching current content...');
    const contentResponse = await fetch(`${baseUrl}/content`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const contentResult = await contentResponse.json();
    if (!contentResult.success) {
      console.error('Failed to fetch content:', contentResult.error);
      return;
    }

    console.log('Current content:');
    contentResult.data.content.forEach(item => {
      console.log(`- ${item.title} (ID: ${item.id}, Order: ${item.menu_order || 0}, Parent: ${item.parent_id || 'none'})`);
    });

    // Test bulk menu update
    console.log('\nTesting bulk menu update...');
    const updates = contentResult.data.content.map((item, index) => ({
      id: item.id,
      menu_order: contentResult.data.content.length - index - 1, // Reverse order
      parent_id: item.parent_id,
      show_in_menu: item.show_in_menu
    }));

    const updateResponse = await fetch(`${baseUrl}/content/bulk-update-menu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ updates }),
    });

    const updateResult = await updateResponse.json();
    if (!updateResult.success) {
      console.error('Menu update failed:', updateResult.error);
      return;
    }

    console.log('Menu update successful!');

    // Fetch content again to verify changes
    console.log('\nFetching updated content...');
    const updatedContentResponse = await fetch(`${baseUrl}/content`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const updatedContentResult = await updatedContentResponse.json();
    if (updatedContentResult.success) {
      console.log('Updated content order:');
      updatedContentResult.data.content
        .sort((a, b) => (a.menu_order || 0) - (b.menu_order || 0))
        .forEach(item => {
          console.log(`- ${item.title} (ID: ${item.id}, Order: ${item.menu_order || 0}, Parent: ${item.parent_id || 'none'})`);
        });
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testMenuUpdate();