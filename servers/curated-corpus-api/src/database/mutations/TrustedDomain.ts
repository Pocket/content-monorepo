import { PrismaClient } from '.prisma/client';
import { TrustedDomain } from '.prisma/client';

/**
 * Created a TrustedDomain if the domain has been scheduled in the past, and can therefore be trusted.
 * This allows us to display a warning to curators if the domain is 'new', in the sense that
 * was never recommended to users before.
 * @param db
 * @param domainName
 */
export async function createTrustedDomainIfPastScheduledDateExists(
  db: PrismaClient,
  domainName: string,
): Promise<null | TrustedDomain> {
  if (await domainNameHasPastScheduledDate(db, domainName)) {
    return await createTrustedDomain(db, domainName);
  } else {
    return null;
  }
}

/**
 * Creates a TrustedDomain if it didn't exist already, and returns the TrustedDomain.
 * @param db
 * @param domainName
 */
export async function createTrustedDomain(
  db: PrismaClient,
  domainName: string,
): Promise<TrustedDomain> {
  // Prisma Client does not have a findOrCreate query. Its documentation says upsert can be used as
  // a workaround. However, it throws a 'Unique constraint failed' error for concurrent queries.
  // Instead, we do this:
  // 1. Read. If it exists we're done.
  // 2. Write. If write succeeds we're done.
  // 3. Read if the write failed due to concurrency.

  // 1. First read.
  const trustedDomain = await db.trustedDomain.findUnique({
    where: { domainName },
  });
  if (trustedDomain) {
    return trustedDomain;
  }

  try {
    // 2. Try to create the TrustedDomain if it does not exist.
    return await db.trustedDomain.create({ data: { domainName } });
  } catch (error) {
    if (error.code === 'P2002') {
      // Concurrent inserts with the same domain cause a unique constraint failure.
      // Prisma recommends retrying: https://www.prisma.io/docs/orm/reference/prisma-client-reference#connectorcreate
      console.log(
        `Unique constraint violation for TrustedDomain ${domainName}. Trying to find it again...`,
      );

      // 3. If creation failed because of concurrent insert attempts, read again.
      return db.trustedDomain.findFirstOrThrow();
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
