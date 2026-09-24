const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const routes = require('./routes');
const swaggerSpec = require('./swagger/swaggerSpec');
const errorHandler = require('./middleware/errorHandler');
const { stripForbiddenFields } = require('./middleware/sanitize');

const app = express();

// 1. Security Headers
app.use(helmet());

// 2. CORS Configuration
app.use(
  cors({
    origin: env.corsOrigin === '*' ? true : env.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);

// 3. Body Parser & Size Limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// 4. Multi-Tenant Parameter Security & NoSQL Query Sanitization
app.use(stripForbiddenFields);

// 5. Global Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.nodeEnv === 'development' ? 10000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});
app.use('/api/', generalLimiter);

// 6. Strict Rate Limiter for Authentication (Login)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.nodeEnv === 'development' ? 2000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many failed login attempts. Please try again after 15 minutes.'
  }
});
app.use('/api/auth/login', loginLimiter);

// 7. Swagger API Documentation Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 9. Root & Health Check Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Multi-Tenant Security Management Platform API is operational.',
    documentation: '/api-docs',
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// 10. API Routes
app.use('/api', routes);

// 11. Handle Unmatched Routes (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}. Route not found.`
  });
});

// 12. Global Error Handling Middleware
app.use(errorHandler);

module.exports = app;
