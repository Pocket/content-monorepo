describe('config.aws.s3.path', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('is a prefix of the path-style URL the AWS SDK Upload Location returns in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.AWS_S3_BUCKET = 'pocket-curatedcorpusapi-prod-images';
    process.env.AWS_REGION = 'us-east-1';

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const config = require('./index').default;

      expect(config.aws.s3.path).toBe(
        'https://s3.us-east-1.amazonaws.com/pocket-curatedcorpusapi-prod-images/',
      );

      // The AWS SDK Upload `Location` for a successful upload to this bucket
      // looks like the line below; `getS3UrlForImageUrl` recognises it via
      // `startsWith(config.aws.s3.path)`, so this prefix relationship must hold.
      const sdkLocation =
        'https://s3.us-east-1.amazonaws.com/pocket-curatedcorpusapi-prod-images/abc-123.jpeg';
      expect(sdkLocation.startsWith(config.aws.s3.path)).toBe(true);
    });
  });

  it('uses the localstack endpoint outside production/development', () => {
    process.env.NODE_ENV = 'test';
    process.env.AWS_S3_BUCKET = 'curated-corpus-api-local-images';
    process.env.AWS_S3_ENDPOINT = 'http://localhost:4566';

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const config = require('./index').default;

      expect(config.aws.s3.path).toBe(
        'http://localhost:4566/curated-corpus-api-local-images/',
      );
    });
  });
});
