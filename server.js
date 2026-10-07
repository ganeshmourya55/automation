'use strict';

const path = require('path');
const express = require('express');
const compression = require('compression');

const apiRoutes = require('./backend/routes/api');
const { apiLimiter } = require('./backend/middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(compression());
app.use(express.json({ limit: '64kb' }));

// --- API ---------------------------------------------------------------
app.use('/api', apiLimiter, apiRoutes);

// --- Static frontend ---------------------------------------------------
// Only files inside /public are ever reachable. Anything in /backend
// is outside the static root and therefore unreachable via HTTP.
app.use(
  express.static(path.join(__dirname, 'public'), {
    index: 'index.html',
    extensions: ['html'],
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    }
  })
);

// Explicit deny for anyone probing backend paths
app.use(['/backend', '/server.js', '/package.json', '/.env'], (req, res) => {
  res.status(404).type('text/plain').send('Not found');
});

// SPA-ish fallback for the calculator page only
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
  res.status(404).type('text/plain').send('Not found');
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ CAC Calculator running on http://localhost:${PORT}`);
  console.log(`   Frontend: /public   Backend: /backend (not served)`);
});