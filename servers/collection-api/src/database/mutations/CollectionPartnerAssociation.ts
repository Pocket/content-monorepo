import { UserInputError } from '@pocket-tools/apollo-utils';
import { Prisma, PrismaClient } from '.prisma/client';

import {
  CollectionPartnerAssociation,
  CreateCollectionPartnerAssociationInput,
  UpdateCollectionPartnerAssociationImageUrlInput,
  UpdateCollectionPartnerAssociationInput,
} from '../types';
import { getCollectionPartnerAssociation } from '../queries';
import { sendEventBridgeEventUpdateFromInternalCollectionId } from '../../events/helpers';

/**
 * @param db
 * @param data
 */
export async function createCollectionPartnerAssociation(
  db: PrismaClient,
  data: CreateCollectionPartnerAssociationInput,
): Promise<CollectionPartnerAssociation> {
  // this property doesn't exist on the Association type returned by this
  // function, instead we return the CollectionPartner object
  const partnerExternalId = data.partnerExternalId;
  delete data.partnerExternalId;

  // this property doesn't exist on the Association type returned by this
  // function, instead we return the Collection object
  const collectionExternalId = data.collectionExternalId;
  delete data.collectionExternalId;

  const dbData: Prisma.CollectionPartnershipCreateInput = {
    ...data,
    partner: { connect: { externalId: partnerExternalId } },
    collection: { connect: { externalId: collectionExternalId } },
  };

  const partnership = await db.collectionPartnership.create({
    data: dbData,
    include: {
      partner: true,
      collection: true,
    },
  });
  // Send to event bridge. We use the internal id, because prisma won't return
  // the joined authors data from the above call, so we let the eventBridge function grab what it needs
  await sendEventBridgeEventUpdateFromInternalCollectionId(
    db,
    partnership.collection.id,
  );
  return partnership;
}

/**
 * @param db
 * @param data
 */
export async function updateCollectionPartnerAssociation(
  db: PrismaClient,
  data: UpdateCollectionPartnerAssociationInput,
): Promise<CollectionPartnerAssociation> {
  if (!data.externalId) {
    throw new UserInputError('externalId must be provided.');
  }

  // this property doesn't exist on the Association type returned by this
  // function, instead we return the CollectionPartner object
  const partnerExternalId = data.partnerExternalId;
  delete data.partnerExternalId;

  const dbData: Prisma.CollectionPartnershipUpdateInput = {
    ...data,
    partner: { connect: { externalId: partnerExternalId } },
  };

  const partnership = await db.collectionPartnership.update({
    where: { externalId: data.externalId },
    data: dbData,
    include: {
      partner: true,
      collection: true,
    },
  });
  // Send to event bridge. We use the internal id, because prisma won't return
  // the joined authors data from the above call, so we let the eventBridge function grab what it needs
  await sendEventBridgeEventUpdateFromInternalCollectionId(
    db,
    partnership.collection.id,
  );
  return partnership;
}

/**
 * @param db
 * @param data
 */
export async function updateCollectionPartnerAssociationImageUrl(
  db: PrismaClient,
  data: UpdateCollectionPartnerAssociationImageUrlInput,
): Promise<CollectionPartnerAssociation> {
  if (!data.externalId) {
    throw new UserInputError('externalId must be provided.');
  }

  const partnership = await db.collectionPartnership.update({
    where: { externalId: data.externalId },
    data: { ...data },
    include: {
      partner: true,
      collection: true,
    },
  });
  // Send to event bridge. We use the internal id, because prisma won't return
  // the joined authors data from the above call, so we let the eventBridge function grab what it needs
  await sendEventBridgeEventUpdateFromInternalCollectionId(
    db,
    partnership.collection.id,
  );
  return partnership;
}

/**
 * @param db
 * @param externalId
 */
export async function deleteCollectionPartnerAssociation(
  db: PrismaClient,
  externalId: string,
): Promise<CollectionPartnerAssociation> {
  if (!externalId) {
    throw new UserInputError('externalId must be provided.');
  }

  // get the existing association for the internal id
  const association = await getCollectionPartnerAssociation(db, externalId);

  if (!association) {
    throw new UserInputError(
      `Cannot delete a collection partner association with external ID "${externalId}"`,
    );
  }

  await db.collectionPartnership.delete({
    where: {
      externalId: association.externalId,
    },
  });

  // When a collection-partner association is deleted, we need to make sure that
  // none of the related collection stories still have a 'fromPartner' value
  // set to true.
  await db.collectionStory.updateMany({
    where: { collectionId: association.collectionId, fromPartner: true },
    data: { fromPartner: false },
  });

  // Send to event bridge. We use the internal id, because prisma won't return
  // the joined authors data from the above call, so we let the eventBridge function grab what it needs
  await sendEventBridgeEventUpdateFromInternalCollectionId(
    db,
    association.collectionId,
  );

  // to conform with the schema, we return the association
  // as it was before we deleted it
  return association;
}
