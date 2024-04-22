import { PrismaClient } from '.prisma/client';
import { TrustedDomain } from '.prisma/client';

/**
 * Created a TrustedDomain if the domain has been scheduled in the past, and can therefore be trusted.
 * This allows us to display a warning to curators for domains that have never been recommended to users.
 * @param db
 * @param domainName
 */
export async function createTrustedDomainIfPastScheduledDateExists(
  db: PrismaClient,
  domainName: string,
): Promise<null | TrustedDomain> {
  // If the domain is already trusted, then we don't need change anything.
  const trustedDomain = await getTrustedDomain(db, domainName);
  if (trustedDomain) {
    return trustedDomain;
  }

  if (await domainNameHasPastScheduledDate(db, domainName)) {
    return await createTrustedDomain(db, domainName);
  } else {
    return null;
  }
}

/**
 * Gets a TrustedDomain if it exists, and returns null if it does not.
 * @param db
 * @param domainName
 */
export async function getTrustedDomain(
  db: PrismaClient,
  domainName: string,
): Promise<TrustedDomain | null> {
  return db.trustedDomain.findUnique({ where: { domainName } });
}

/**
 * Creates a TrustedDomain, and returns the TrustedDomain.
 * @param db
 * @param domainName
 */
export async function createTrustedDomain(
  db: PrismaClient,
  domainName: string,
): Promise<TrustedDomain> {
  try {
    return await db.trustedDomain.create({ data: { domainName } });
  } catch (error) {
    if (error.code === 'P2002') {
      // Concurrent inserts with the same domain can cause a unique constraint failure.
      console.log(`TrustedDomain ${domainName} already existed.`);
      return await getTrustedDomain(db, domainName);
    } else {
      // For all other errors, do not retry.
      throw error;
    }
  }
}

/**
 * Returns true if a ScheduledItem exists with a past scheduled date for the given `domainName`.
 * @param db
 * @param domainName
 */
async function domainNameHasPastScheduledDate(
  db: PrismaClient,
  domainName: string,
): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Remove the time-part.

  const result = await db.scheduledItem.findFirst({
    where: {
      scheduledDate: {
        lt: today, // if scheduledDate is strictly less than today, then it has been scheduled in the past.
      },
      approvedItem: {
        domainName,
      },
    },
    include: {
      approvedItem: true,
    },
  });

  return result !== null;
}
