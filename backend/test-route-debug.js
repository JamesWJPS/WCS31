const express = require('express');
const app = express();

app.use(express.json());

// Test routes to see which one gets hit
app.put('/api/content/bulk-update', (req, res) => {
  console.log('✅ HIT: PUT /api/content/bulk-update');
  res.json({ success: true, route: 'bulk-update' });
});

app.post('/api/content', (req, res) => {
  console.log('✅ HIT: POST /api/content');
  res.json({ success: true, route: 'post-content' });
});

app.put('/api/content/:id', (req, res) => {
  console.log('✅ HIT: PUT /api/content/:id with id:', req.params.id);
  res.json({ success: true, route: 'put-content-id', id: req.params.id });
});

app.listen(3002, () => {
  console.log('🧪 Test server running on port 3002');
});