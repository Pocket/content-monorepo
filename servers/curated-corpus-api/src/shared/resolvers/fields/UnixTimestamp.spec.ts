import { getUnixTimestamp } from './UnixTimestamp';

describe('getUnixTimestamp', () => {
  it('should truncate (floor) milliseconds, not round them', () => {
    // A date with 999ms - Math.round would round UP to the next second
    const date = new Date('2024-06-15T12:00:00.999Z');
    const expected = Math.floor(date.getTime() / 1000);

    expect(getUnixTimestamp(date)).toBe(expected);
  });

  it('should return null for a falsy date', () => {
    expect(getUnixTimestamp(null as any)).toBeNull();
  });
});
