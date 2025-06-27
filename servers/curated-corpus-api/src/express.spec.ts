import request from 'supertest';
import express, { Express } from 'express';
import { serverLogger } from '@pocket-tools/ts-logger';

// Mock the logger to avoid console output during tests
jest.mock('@pocket-tools/ts-logger', () => ({
  serverLogger: {
    error: jest.fn(),
  },
  setMorgan: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

describe('express JSON error handling', () => {
  let app: Express;

  beforeEach(() => {
    // Create a minimal Express app with just the JSON parser and error handler
    app = express();
    
    // Add the JSON parser
    app.use(express.json());
    
    // Add the JSON parsing error handler (same as in express.ts)
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (err instanceof SyntaxError && 'body' in err) {
        serverLogger.error('Invalid JSON in request body', { error: err.message });
        return res.status(400).json({ 
          error: 'Invalid JSON', 
          message: 'The request body contains invalid JSON syntax' 
        });
      }
      next(err);
    });
    
    // Add a test endpoint
    app.post('/test', (req, res) => {
      res.json({ received: req.body });
    });
  });

  describe('JSON parsing error handler', () => {
    it('should return 400 error for invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json"}'); // Malformed JSON

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid JSON',
        message: 'The request body contains invalid JSON syntax'
      });
      expect(serverLogger.error).toHaveBeenCalledWith(
        'Invalid JSON in request body',
        expect.objectContaining({ error: expect.stringContaining('Unexpected token') })
      );
    });

    it('should return 400 error for completely invalid JSON', async () => {
      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send('not json at all');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid JSON',
        message: 'The request body contains invalid JSON syntax'
      });
    });

    it('should return 400 error for unclosed quotes', async () => {
      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send('{"unclosed": "quote}');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid JSON',
        message: 'The request body contains invalid JSON syntax'
      });
    });

    it('should pass through valid JSON without error', async () => {
      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send('{"valid": "json"}');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        received: { valid: 'json' }
      });
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send('');

      // Empty body is valid (no content to parse)
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        received: {}
      });
    });

    it('should handle JSON with trailing comma', async () => {
      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send('{"key": "value",}');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid JSON',
        message: 'The request body contains invalid JSON syntax'
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});