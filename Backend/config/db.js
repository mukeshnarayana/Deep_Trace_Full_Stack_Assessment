const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async (customUri) => {
  try {
    const uri = customUri || env.mongoUri;
    const options = {
      dbName: env.dbName
    };
    const conn = await mongoose.connect(uri, options);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] ${error.message}`);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

module.exports = connectDB;
