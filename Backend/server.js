const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    const server = app.listen(env.port, () => {
      console.log(`=======================================================`);
      console.log(` Security Platform Server running on port ${env.port}`);
      console.log(` Environment: ${env.nodeEnv}`);
      console.log(` API Documentation: http://localhost:${env.port}/api-docs`);
      console.log(`=======================================================`);
    });

    // Handle Unhandled Promise Rejections
    process.on('unhandledRejection', (err) => {
      console.error(`[Unhandled Rejection] ${err.message}`);
      server.close(() => process.exit(1));
    });

    // Handle Uncaught Exceptions
    process.on('uncaughtException', (err) => {
      console.error(`[Uncaught Exception] ${err.message}`);
      process.exit(1);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
