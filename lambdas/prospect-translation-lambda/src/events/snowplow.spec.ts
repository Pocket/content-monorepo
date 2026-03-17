import { generateSnowplowEntity } from './snowplow';
import { Prospect } from 'prospectapi-common';
import { ProspectFeatures, ProspectRunDetails } from 'content-common';

describe('generateSnowplowEntity', () => {
  const baseProspect: Prospect = {
    id: 'test-uuid',
    prospectId: 'ml-prospect-id',
    scheduledSurfaceGuid: 'NEW_TAB_EN_US',
    prospectType: 'TIMESPENT' as any,
    url: 'https://example.com/article',
    topic: 'TECHNOLOGY' as any,
    saveCount: 100,
    rank: 1,
    title: 'Test Article',
    excerpt: 'Test excerpt',
    imageUrl: 'https://example.com/image.jpg',
    language: 'EN',
    publisher: 'Example Publisher',
    domain: 'example.com',
    isCollection: false,
    isSyndicated: false,
    authors: 'Author One,Author Two',
  };

  const runDetails: ProspectRunDetails = {
    candidate_set_id: 'candidate-set-1',
    expires_at: 1700000000,
    flow: 'test-flow',
    run_id: 'run-1',
  };

  const features: ProspectFeatures = {
    data_source: 'prospect',
    rank: 1,
    save_count: 100,
    predicted_topic: 'TECHNOLOGY',
  };

  it('should truncate (floor) the fallback timestamp when createdAt is not set, not round it', () => {
    // Mock Date.now() to return a time with >=500 ms, which would cause
    // Math.round to round UP (producing a timestamp 1 second in the future).
    // Math.floor would correctly truncate.
    const mockNow = 1700000000999; // 999ms past the second
    jest.spyOn(Date, 'now').mockReturnValue(mockNow);

    const prospectWithoutCreatedAt: Prospect = {
      ...baseProspect,
      createdAt: undefined,
    };

    const entity = generateSnowplowEntity(
      prospectWithoutCreatedAt,
      runDetails,
      features,
    );

    // Math.floor(1700000000999 / 1000) = 1700000000
    // Math.round(1700000000999 / 1000) = 1700000001 (WRONG - 1 second in the future)
    expect(entity.created_at).toBe(Math.floor(mockNow / 1000));
    expect(entity.created_at).not.toBe(Math.round(mockNow / 1000));

    jest.restoreAllMocks();
  });
});
