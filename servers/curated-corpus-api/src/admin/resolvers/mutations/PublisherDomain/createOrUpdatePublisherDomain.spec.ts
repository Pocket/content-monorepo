import { createOrUpdatePublisherDomain } from '.';
import * as utils from '../../../../shared/utils';
import * as dbMutations from '../../../../database/mutations/PublisherDomain';
import { IAdminContext } from '../../../context';

describe('createOrUpdatePublisherDomain resolver', () => {
  // Spies for utility functions
  let normalizeDomainSpy: jest.SpyInstance;
  let validateDomainNameSpy: jest.SpyInstance;
  let dbCreateOrUpdateSpy: jest.SpyInstance;

  // Mock context with authorized user
  const mockContext = {
    authenticatedUser: {
      canWriteToCorpus: jest.fn().mockReturnValue(true),
      username: 'test.user@test.com',
    },
    db: {} as any,
  } as unknown as IAdminContext;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up spies
    normalizeDomainSpy = jest
      .spyOn(utils, 'normalizeDomain')
      .mockReturnValue('normalized.com');

    validateDomainNameSpy = jest
      .spyOn(utils, 'validateDomainName')
      .mockImplementation(() => undefined);

    dbCreateOrUpdateSpy = jest
      .spyOn(dbMutations, 'createOrUpdatePublisherDomain')
      .mockResolvedValue({
        domainName: 'normalized.com',
        publisher: 'Test Publisher',
        createdAt: new Date(),
        createdBy: 'test.user@test.com',
        updatedAt: new Date(),
        updatedBy: null,
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call normalizeDomain with the input domain name', async () => {
    const data = {
      domainName: 'WWW.Example.COM',
      publisher: 'Test Publisher',
    };

    await createOrUpdatePublisherDomain(null, { data }, mockContext);

    expect(normalizeDomainSpy).toHaveBeenCalledTimes(1);
    expect(normalizeDomainSpy).toHaveBeenCalledWith('WWW.Example.COM');
  });

  it('should call validateDomainName with the normalized domain', async () => {
    const data = {
      domainName: 'WWW.Example.COM',
      publisher: 'Test Publisher',
    };

    await createOrUpdatePublisherDomain(null, { data }, mockContext);

    expect(validateDomainNameSpy).toHaveBeenCalledTimes(1);
    // Should be called with the normalized value, not the original input
    expect(validateDomainNameSpy).toHaveBeenCalledWith('normalized.com');
  });

  it('should pass normalized domain to database mutation', async () => {
    const data = {
      domainName: 'WWW.Example.COM',
      publisher: 'Test Publisher',
    };

    await createOrUpdatePublisherDomain(null, { data }, mockContext);

    expect(dbCreateOrUpdateSpy).toHaveBeenCalledTimes(1);
    expect(dbCreateOrUpdateSpy).toHaveBeenCalledWith(
      mockContext.db,
      { domainName: 'normalized.com', publisher: 'Test Publisher' },
      'test.user@test.com',
    );
  });

  it('should propagate validation errors', async () => {
    const validationError = new Error('Domain validation failed');
    validateDomainNameSpy.mockImplementation(() => {
      throw validationError;
    });

    const data = {
      domainName: 'invalid-domain',
      publisher: 'Test Publisher',
    };

    await expect(
      createOrUpdatePublisherDomain(null, { data }, mockContext),
    ).rejects.toThrow('Domain validation failed');

    // Should call normalize but fail at validation
    expect(normalizeDomainSpy).toHaveBeenCalledTimes(1);
    expect(validateDomainNameSpy).toHaveBeenCalledTimes(1);
    // Should not call database when validation fails
    expect(dbCreateOrUpdateSpy).not.toHaveBeenCalled();
  });
});
