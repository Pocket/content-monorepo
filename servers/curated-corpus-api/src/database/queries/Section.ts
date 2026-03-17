import { PrismaClient } from '.prisma/client';
import { DateTime } from 'luxon';
import { Section } from '../types';
import { titleToSlug, resolveSlugCollisions } from '../../shared/slugify';

/**
 * This query retrieves all active Sections & their associated active SectionItems for a given ScheduledSurface.
 * If the context is public, only LIVE, active & enabled Sections are retrieved.
 * If the context is admin, all active & enabled/disabled Sections are retrieved.
 * Returns an empty array if no Sections are found.
 *
 * @param db
 * @param isPublicContext
 * @param scheduledSurfaceGuid
 * @param createSource - optional filter to query by createSource (ML or MANUAL)
 */
export async function getSectionsWithSectionItems(
  db: PrismaClient,
  isPublicContext: boolean,
  scheduledSurfaceGuid: string,
  createSource?: 'ML' | 'MANUAL',
): Promise<Section[]> {
  const currentDate = DateTime.utc().startOf('day').toJSDate();

  const filterLiveSections = {
    disabled: false,
    OR: [
      // ML sections (no startDate or endDate)
      { startDate: null, endDate: null },
      {
        // Custom Sections that are currently live
        // a. startDate <= currentDate
        startDate: { lte: currentDate },
        OR: [
          // b. no endDate
          { endDate: null },
          // c. currentDate < endDate
          { endDate: { gt: currentDate } },
        ],
      },
    ],
  };

  const sections = await db.section.findMany({
    where: {
      scheduledSurfaceGuid,
      active: true,
      ...(isPublicContext && filterLiveSections),
      ...(createSource ? { createSource } : {}),
    },
    include: {
      sectionItems: {
        where: {
          active: true,
        },
        orderBy: { rank: 'asc' },
        include: {
          approvedItem: {
            include: {
              authors: {
                orderBy: [{ sortOrder: 'asc' }],
              },
            },
          },
          section: true,
        },
      },
    },
  });

  return sections;
}

/**
 * Returns all externalIds that match a base slug or start with `${baseSlug}-`.
 * Used to detect collisions when generating unique section slugs.
 */
export async function getSectionSlugCollisions(
  db: PrismaClient,
  baseSlug: string,
): Promise<string[]> {
  const collisions = await db.section.findMany({
    where: {
      OR: [
        { externalId: baseSlug },
        { externalId: { startsWith: `${baseSlug}-` } },
      ],
    },
    select: { externalId: true },
  });

  return collisions.map((s) => s.externalId);
}

/**
 * Generates a unique section slug from a title, checking for collisions
 * globally against all sections (active and inactive). externalId has a
 * global unique constraint in the database.
 *
 * On collision, appends -2, -3, etc.
 */
export async function generateSectionSlug(
  title: string,
  db: PrismaClient,
): Promise<string> {
  const baseSlug = titleToSlug(title);
  const collisions = await getSectionSlugCollisions(db, baseSlug);

  return resolveSlugCollisions(baseSlug, collisions);
}
