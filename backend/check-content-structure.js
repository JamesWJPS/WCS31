const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking content structure...\n');

db.all('SELECT id, title, menu_title, menu_order, parent_id, show_in_menu, status FROM content ORDER BY menu_order ASC, created_at DESC', (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
    return;
  }

  console.log('📋 Current content structure:');
  console.log('ID'.padEnd(15) + 'Title'.padEnd(25) + 'Menu Title'.padEnd(20) + 'Order'.padEnd(8) + 'Parent'.padEnd(15) + 'Show'.padEnd(6) + 'Status');
  console.log('-'.repeat(100));
  
  rows.forEach(row => {
    console.log(
      (row.id || '').padEnd(15) + 
      (row.title || '').padEnd(25) + 
      (row.menu_title || '').padEnd(20) + 
      (row.menu_order || 0).toString().padEnd(8) + 
      (row.parent_id || '').padEnd(15) + 
      (row.show_in_menu ? 'Yes' : 'No').padEnd(6) + 
      (row.status || '')
    );
  });

  console.log('\n🌳 Tree structure:');
  buildTree(rows);
  
  db.close();
});

function buildTree(items) {
  const tree = [];
  const itemMap = new Map();
  
  // Create a map of all items
  items.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] });
  });
  
  // Build the tree structure
  items.forEach(item => {
    const treeItem = itemMap.get(item.id);
    if (item.parent_id && itemMap.has(item.parent_id)) {
      itemMap.get(item.parent_id).children.push(treeItem);
    } else {
      tree.push(treeItem);
    }
  });
  
  // Sort by menu_order
  const sortByOrder = (a, b) => (a.menu_order || 0) - (b.menu_order || 0);
  tree.sort(sortByOrder);
  tree.forEach(item => {
    if (item.children.length > 0) {
      item.children.sort(sortByOrder);
    }
  });
  
  // Display tree
  function displayTree(items, level = 0) {
    items.forEach(item => {
      const indent = '  '.repeat(level);
      const prefix = level > 0 ? '└─ ' : '';
      console.log(`${indent}${prefix}${item.title} (Order: ${item.menu_order || 0}, Parent: ${item.parent_id || 'none'})`);
      if (item.children.length > 0) {
        displayTree(item.children, level + 1);
      }
    });
  }
  
  displayTree(tree);
}