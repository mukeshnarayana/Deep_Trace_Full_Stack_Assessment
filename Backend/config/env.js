const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/multi_tenant_db',
  dbName: process.env.DB_NAME || 'Multi_Tenant',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_key_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  nodeEnv: process.env.NODE_ENV || 'development'
};
