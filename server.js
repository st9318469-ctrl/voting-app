const express = require('express')
const app = express();
const path = require('path');
const fs = require('fs');
const db = require('./db');
const dns = require('dns');
const cors = require('cors');


dns.setServers(["1.1.1.1","8.8.8.8"]);



const bodyParser = require('body-parser');
app.use(bodyParser.json());
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'https://voting-app-sachin.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      /^https:\/\/voting-app-sachin.*\.vercel\.app$/.test(origin)
    ) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
}));
const PORT = process.env.PORT || 3000;

const userRoutes = require('./routes/userRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');

app.get('/', (req, res) => {
  if (fs.existsSync(frontendIndexPath)) {
    return res.sendFile(frontendIndexPath);
  }

  res.send('Voting app server is running');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: db.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use('/user', userRoutes);
app.use('/candidate', candidateRoutes);
app.use('/api/auth', userRoutes);
app.use('/api/candidates', candidateRoutes);

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  app.get(/^\/(?!api\/|user\/|candidate\/|health$).*/, (req, res) => {
    res.sendFile(frontendIndexPath);
  });
}




const server = app.listen(PORT, '0.0.0.0',()=>{
  console.log(`listening to the port ${PORT}`);
});

module.exports = server;
