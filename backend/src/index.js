require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const documentRoutes = require('./routes/documents');
const chatRoutes = require('./routes/chat');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev')); 

app.get('/', (req, res) => {
  res.json({
    message: 'havrs. Document Assistant — Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /health',
      documents: {
        upload: 'POST /api/documents/upload',
        list: 'GET /api/documents',
        get: 'GET /api/documents/:id',
        delete: 'DELETE /api/documents/:id'
      },
      chat: {
        send: 'POST /api/chat',
        history: 'GET /api/chat/history/:sessionId'
      }
    }
  });
});

app.get('/health', async (req, res) => {
  const axios = require('axios');
  let aiServiceStatus = 'unreachable';

  try {
    const response = await axios.get(`${process.env.AI_SERVICE_URL}/health`, { timeout: 3000 });
    if (response.status === 200) aiServiceStatus = 'online';
  } catch {
    aiServiceStatus = 'offline';
  }

  res.json({
    status: 'ok',
    backend: 'online',
    aiService: aiServiceStatus,
    timestamp: new Date().toISOString()
  });
});

app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use(errorHandler);
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   havrs. Backend Server — Running        ║');
  console.log(`║   http://localhost:${PORT}                  ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`  AI Service target: ${process.env.AI_SERVICE_URL}`);
  console.log(`  Environment: ${process.env.NODE_ENV}`);
  console.log('');
});