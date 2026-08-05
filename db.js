const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });

const mongoURL = process.env.MONGODB_URL;

if (!mongoURL) {
  throw new Error('MONGODB_URL is not defined in .env');
}

mongoose.connect(mongoURL, {
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  bufferTimeoutMS: 0,
  maxPoolSize: 50,
}).catch((err) => {
  console.error('mongodb connection failed', err.message);
});

const db = mongoose.connection;

db.on('connected',()=>{
  console.log('connected to mongodb server');

});

db.on('error',(err)=>{
  console.error('mongodb connection error', err);

});

db.on('disconnected', () => {
console.log('mongodb disconnected')
})

module.exports = db;
  