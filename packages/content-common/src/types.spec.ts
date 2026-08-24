import { ScheduledSurfaces, ScheduledSurfacesEnum } from './types';

describe('types', () => {
  // ScheduledSurfacesEnum and ScheduledSurfaces are two hand-maintained lists
  // of the same set of surfaces. ScheduledSurfacesEnum is what the SQS lambdas
  // validate incoming messages against, so a guid present in one and absent
  // from the other silently dead-letters every message for that surface.
  describe('ScheduledSurfacesEnum and ScheduledSurfaces', () => {
    const enumGuids = new Set<string>(Object.values(ScheduledSurfacesEnum));
    const surfaceGuids = new Set(ScheduledSurfaces.map((s) => s.guid));

    it('should have an enum member for every ScheduledSurfaces guid', () => {
      const missing = [...surfaceGuids].filter((g) => !enumGuids.has(g));

      expect(missing).toEqual([]);
    });

    it('should have a ScheduledSurfaces entry for every enum member', () => {
      const missing = [...enumGuids].filter((g) => !surfaceGuids.has(g));

      expect(missing).toEqual([]);
    });
  });
});
