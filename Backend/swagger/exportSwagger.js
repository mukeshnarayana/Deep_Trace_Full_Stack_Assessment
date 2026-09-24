const fs = require('fs');
const path = require('path');
const swaggerSpec = require('./swaggerSpec');

fs.writeFileSync(
  path.join(__dirname, 'swagger.json'),
  JSON.stringify(swaggerSpec, null, 2),
  'utf-8'
);
console.log('Swagger JSON generated successfully.');
