import { updateSectionItem } from '.';
import * as dbMutations from '../../../../database/mutations/SectionItem';
import { IAdminContext } from '../../../context';
import { SectionItemEventType } from '../../../../events/types';

describe('updateSectionItem resolver', () => {
  let dbUpdateSpy: jest.SpyInstance;

  const mockSectionItem = {
    id: 1,
    externalId: 'section-item-uuid',
    sectionId: 10,
    approvedItemId: 20,
    rank: 5,
    active: true,
    deactivateReasons: null,
    deactivateSource: null,
    deactivatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    approvedItem: { externalId: 'approved-item-uuid', url: 'https://example.com' },
    section: {
      id: 10,
      externalId: 'section-uuid',
      scheduledSurfaceGuid: 'NEW_TAB_EN_US',
    },
  };

  const mockEmitSectionItemEvent = jest.fn();

  const mockContext = {
    authenticatedUser: {
      canWriteToSurface: jest.fn().mockReturnValue(true),
      username: 'test.user@test.com',
    },
    db: {
      sectionItem: {
        findUnique: jest.fn().mockResolvedValue({
          ...mockSectionItem,
          section: {
            scheduledSurfaceGuid: 'NEW_TAB_EN_US',
          },
        }),
      },
    } as any,
    emitSectionItemEvent: mockEmitSectionItemEvent,
  } as unknown as IAdminContext;

  beforeEach(() => {
    jest.clearAllMocks();

    dbUpdateSpy = jest
      .spyOn(dbMutations, 'updateSectionItem')
      .mockResolvedValue(mockSectionItem as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should update rank on a SectionItem', async () => {
    const data = { externalId: 'section-item-uuid', rank: 3 };

    const result = await updateSectionItem(null, { data }, mockContext);

    expect(dbUpdateSpy).toHaveBeenCalledTimes(1);
    expect(dbUpdateSpy).toHaveBeenCalledWith(mockContext.db, {
      externalId: 'section-item-uuid',
      rank: 3,
    });
    expect(result).toEqual(mockSectionItem);
  });

  it('should update rank to 0 (falsy value)', async () => {
    const data = { externalId: 'section-item-uuid', rank: 0 };

    await updateSectionItem(null, { data }, mockContext);

    expect(dbUpdateSpy).toHaveBeenCalledTimes(1);
    expect(dbUpdateSpy).toHaveBeenCalledWith(mockContext.db, {
      externalId: 'section-item-uuid',
      rank: 0,
    });
  });

  it('should emit UPDATE_SECTION_ITEM event', async () => {
    const data = { externalId: 'section-item-uuid', rank: 3 };

    await updateSectionItem(null, { data }, mockContext);

    expect(mockEmitSectionItemEvent).toHaveBeenCalledTimes(1);
    expect(mockEmitSectionItemEvent).toHaveBeenCalledWith(
      SectionItemEventType.UPDATE_SECTION_ITEM,
      expect.objectContaining({
        sectionItem: expect.objectContaining({
          externalId: 'section-item-uuid',
        }),
      }),
    );
  });

  it('should throw NotFoundError if section item does not exist', async () => {
    (mockContext.db as any).sectionItem.findUnique.mockResolvedValueOnce(null);

    const data = { externalId: 'nonexistent-uuid', rank: 3 };

    await expect(
      updateSectionItem(null, { data }, mockContext),
    ).rejects.toThrow('does not exist');

    expect(dbUpdateSpy).not.toHaveBeenCalled();
  });

  it('should throw AuthenticationError if user lacks surface access', async () => {
    (mockContext.authenticatedUser.canWriteToSurface as jest.Mock).mockReturnValueOnce(false);

    const data = { externalId: 'section-item-uuid', rank: 3 };

    await expect(
      updateSectionItem(null, { data }, mockContext),
    ).rejects.toThrow('You do not have access to perform this action.');

    expect(dbUpdateSpy).not.toHaveBeenCalled();
  });
});
