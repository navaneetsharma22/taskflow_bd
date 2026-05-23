# TaskFlow Testing Framework

## Structure
The `tests/` directory contains unit, integration, and end-to-end tests:
*   `integration/`: Integrations tests testing API endpoints using `supertest`.
*   `unit/`: Core mathematical models, validators, and service-layer transforms in isolation.
*   `fixtures/`: Shared test resources and database seeding profiles (users, tokens, organizations).

## Recommended Standard
We recommend using **Jest** or **Vitest** alongside **Supertest** for testing Express endpoints.

### Example Integration Test Template (`tests/integration/health.test.js`):
```javascript
import request from 'supertest';
import app from '../../src/app.js';
import mongoose from 'mongoose';

describe('API Health Telemetry Endpoint', () => {
  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('should return 200 OK and valid health details', async () => {
    const res = await request(app)
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body.database).toHaveProperty('status');
  });
});
```
