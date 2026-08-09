const express = require('express')
const app = express();
const db = require('./db');
const dns = require('dns');

dns.setServers(["1.1.1.1","8.8.8.8"]);



const bodyParser = require('body-parser');
app.use(bodyParser.json());
const PORT = process.env.PORT || 3000;

const userRoutes = require('./routes/userRoutes');
const candidateRoutes = require('./routes/candidateRoutes');

app.get('/', (req, res) => {
  res.send('Voting app server is running');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: db.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use('/user',userRoutes);
app.use('/candidate',candidateRoutes);



const server = app.listen(PORT, '127.0.0.1',()=>{
  console.log(`listening to the port ${PORT}`);
});

module.exports = server;
