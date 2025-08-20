async function setupMenuOrder() {
  const baseUrl = 'http://localhost:3001/api';
  
  try {
    // First, login to get a token
    console.log('🔐 Logging in...');
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
    console.log('Login response:', loginResult);
    
    if (!loginResult.success) {
      console.error('❌ Login failed:', loginResult.error);
      return;
    }

    const token = loginResult.token;
    console.log('✅ Login successful');

    // Get current content
    console.log('\n📋 Fetching current content...');
    const contentResponse = await fetch(`${baseUrl}/content`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const contentResult = await contentResponse.json();
    console.log('Content response:', contentResult);
    
    if (!contentResult.success) {
      console.error('❌ Failed to fetch content:', contentResult.error);
      return;
    }

    const content = contentResult.data || [];
    console.log(`Found ${content.length} content items`);

    // Define a logical menu structure
    const menuStructure = [
      {
        title: 'Welcome to Our Council',
        order: 0,
        parent: null,
        visible: true
      },
      {
        title: 'About Our Council', 
        order: 1,
        parent: null,
        visible: true
      },
      {
        title: 'Our Services',
        order: 2,
        parent: null,
        visible: true,
        children: [
          {
            title: 'Waste Management 1',
            order: 0,
            visible: true
          },
          {
            title: 'Planning Applications',
            order: 1,
            visible: true
          },
          {
            title: 'Contact Information',
            order: 2,
            visible: true
          }
        ]
      },
      {
        title: 'Test Content',
        order: 3,
        parent: null,
        visible: true
      },
      {
        title: 'Hidden Page 2',
        order: 4,
        parent: null,
        visible: false // Hide this page from menu
      }
    ];

    // Create updates array
    const updates = [];
    
    // Process main menu items
    menuStructure.forEach((item, index) => {
      const contentItem = content.find(c => c.title === item.title);
      if (contentItem) {
        updates.push({
          id: contentItem.id,
          menu_order: item.order,
          parent_id: item.parent,
          show_in_menu: item.visible ? 1 : 0
        });

        // Process children if they exist
        if (item.children) {
          item.children.forEach((child, childIndex) => {
            const childContentItem = content.find(c => c.title === child.title);
            if (childContentItem) {
              updates.push({
                id: childContentItem.id,
                menu_order: child.order,
                parent_id: contentItem.id,
                show_in_menu: child.visible ? 1 : 0
              });
            }
          });
        }
      }
    });

    console.log('\n🔄 Applying menu structure...');
    console.log('Updates to apply:');
    updates.forEach(update => {
      const item = content.find(c => c.id === update.id);
      const parentItem = update.parent_id ? content.find(c => c.id === update.parent_id) : null;
      console.log(`  - ${item?.title}: Order ${update.menu_order}, Parent: ${parentItem?.title || 'none'}, Visible: ${update.show_in_menu ? 'Yes' : 'No'}`);
    });

    // Apply the updates
    const updateResponse = await fetch(`${baseUrl}/content/bulk-update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ contents: updates }),
    });

    const updateResult = await updateResponse.json();
    if (!updateResult.success) {
      console.error('❌ Menu update failed:', updateResult.error);
      return;
    }

    console.log('✅ Menu structure updated successfully!');

    // Show the new structure
    console.log('\n🌳 New menu structure:');
    console.log('1. Welcome to Our Council');
    console.log('2. About Our Council');
    console.log('3. Our Services');
    console.log('   ├─ Waste Management 1');
    console.log('   ├─ Planning Applications');
    console.log('   └─ Contact Information');
    console.log('4. Test Content');
    console.log('5. Hidden Page 2 (hidden from menu)');

    console.log('\n📝 Next steps:');
    console.log('1. Go to /dashboard in your browser');
    console.log('2. Click the menu management button (📋) in the sidebar');
    console.log('3. Use drag & drop to further customize the menu order');
    console.log('4. Visit /public to see the public site with the new menu');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setupMenuOrder();