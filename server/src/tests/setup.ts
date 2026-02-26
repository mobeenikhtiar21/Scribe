// Test environment setup — runs before all test files
process.env.NODE_ENV = 'test';
process.env.BC_CLIENT_ID = 'test-client-id';
process.env.BC_CLIENT_SECRET = 'test-client-secret';
process.env.BC_APP_URL = 'https://test.example.com';
process.env.EMAIL_FROM = 'test@scribe-app.com';
// No SENDGRID_API_KEY — forces jsonTransport in email service
