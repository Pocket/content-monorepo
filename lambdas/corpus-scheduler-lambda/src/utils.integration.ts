import { mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput } from './utils';
import { createScheduledCandidate } from './testHelpers';
import { SnowplowScheduledCorpusCandidateErrorName } from './events/types';
import { resetSnowplowEvents, waitForSnowplowEvents } from 'content-common';
import { extractScheduledCandidateEntity } from './events/testHelpers';

describe('utils integrations', function () {
  beforeEach(async () => {
    await resetSnowplowEvents();
  });

  describe('mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput', () => {
    describe('error handling', () => {
      interface MetadataErrorTestCase {
        candidateKey: string;
        expectedSnowplowError: SnowplowScheduledCorpusCandidateErrorName;
      }

      const metadataErrorTestCases: MetadataErrorTestCase[] = [
        {
          candidateKey: 'title',
          expectedSnowplowError:
            SnowplowScheduledCorpusCandidateErrorName.MISSING_TITLE,
        },
        {
          candidateKey: 'excerpt',
          expectedSnowplowError:
            SnowplowScheduledCorpusCandidateErrorName.MISSING_EXCERPT,
        },
        {
          candidateKey: 'image_url',
          expectedSnowplowError:
            SnowplowScheduledCorpusCandidateErrorName.MISSING_IMAGE,
        },
      ];

      metadataErrorTestCases.forEach(
        ({ candidateKey, expectedSnowplowError }) => {
          it(`should emit a Snowplow event when ${candidateKey} is missing with error_name=${expectedSnowplowError}`, async () => {
            const incompleteCandidate: any = createScheduledCandidate();
            incompleteCandidate.scheduled_corpus_item[candidateKey] = undefined;

            await expect(
              mapScheduledCandidateInputToCreateApprovedCorpusItemApiInput(
                incompleteCandidate,
              ),
            ).rejects.toThrow(Error);

            const allEvents = await waitForSnowplowEvents();
            expect(allEvents).toEqual({ total: 1, good: 1, bad: 0 });

            // Check that the right error was emitted.
            const snowplowEntity = await extractScheduledCandidateEntity();
            expect(snowplowEntity.error_name).toEqual(expectedSnowplowError);
            expect(snowplowEntity.error_description).toBeTruthy();
          });
        },
      );
    });
  });
});
