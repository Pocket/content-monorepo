import { S3 } from '@aws-sdk/client-s3';
import { IncomingHttpHeaders } from 'http';
import Express from 'express';
import { BaseContext } from '@apollo/server';
import { PrismaClient } from '.prisma/client';
import { client } from '../database/client';
import { CuratedCorpusEventEmitter } from '../events/curatedCorpusEventEmitter';
import {
  ApprovedCorpusItemPayload,
  RejectedCorpusItemPayload,
  ReviewedCorpusItemEventType,
  ReviewedCorpusItemPayload,
  ScheduledCorpusItemEventType,
  ScheduledCorpusItemPayload,
} from '../events/types';
import s3 from './aws/s3';
import { MozillaAccessGroup } from 'content-common';
import {
  getScheduledSurfaceByGuid,
  scheduledSurfaceAccessGroups,
} from '../shared/utils';
import { curatedCorpusEventEmitter } from '../events/init';

// Custom properties we get from Admin API for the authenticated user
export interface AdminAPIUser extends BaseContext {
  name: string;
  groups: string[];
  username: string;
  // and extra convenience props to cut down on checking actual Mozilla access
  // groups within resolvers
  hasFullAccess: boolean;
  hasReadOnly: boolean;
  canRead: (scheduledSurfaceGuid: string) => boolean;
  canWriteToCorpus: () => boolean;
  canWriteToSurface: (scheduledSurfaceGuid: string) => boolean;
}

// Context interface
export interface IAdminContext {
  db: PrismaClient;
  headers: IncomingHttpHeaders;
  eventEmitter: CuratedCorpusEventEmitter;
  s3: S3;
  authenticatedUser: AdminAPIUser;

  emitReviewedCorpusItemEvent(
    event: ReviewedCorpusItemEventType,
    reviewedCorpusItem: ApprovedCorpusItemPayload | RejectedCorpusItemPayload,
  ): void;

  emitScheduledCorpusItemEvent(
    event: ScheduledCorpusItemEventType,
    scheduledCorpusItem: ScheduledCorpusItemPayload,
  ): void;
}

export class AdminContextManager implements IAdminContext {
  constructor(
    private config: {
      request: Express.Request;
      db: PrismaClient;
      s3: S3;
      eventEmitter: CuratedCorpusEventEmitter;
    },
  ) {}

  get db(): IAdminContext['db'] {
    return this.config.db;
  }

  get headers(): { [key: string]: any } {
    return this.config.request.headers;
  }

  get s3(): IAdminContext['s3'] {
    return this.config.s3;
  }

  get authenticatedUser(): AdminAPIUser {
    // If anyone decides to work with/test the subgraph directly,
    // make sure we cater for undefined headers.
    const groups = this.config.request.headers.groups as string;
    const accessGroups = groups ? groups.split(',') : [];

    const hasFullAccess = accessGroups.includes(
      MozillaAccessGroup.SCHEDULED_SURFACE_CURATOR_FULL,
    );
    const hasReadOnly = accessGroups.includes(MozillaAccessGroup.READONLY);

    const user: AdminAPIUser = {
      name: this.config.request.headers.name as string,
      username: this.config.request.headers.username as string,
      groups: accessGroups,
      hasFullAccess,
      hasReadOnly,
      // Whether the authenticated user can run queries for a given scheduled surface
      canRead: (scheduledSurfaceGuid: string): boolean =>
        hasReadOnly || user.canWriteToSurface(scheduledSurfaceGuid),

      // Whether the authenticated user can execute mutations for corpus entities
      canWriteToCorpus: (): boolean => {
        // Full access to everything is an automatic "Yes".
        if (hasFullAccess) {
          return true;
        }

        // As long as the user has access to a specific scheduled surface,
        // they can create/edit/delete corpus items, too.
        return (
          accessGroups.filter((element) => {
            return scheduledSurfaceAccessGroups.includes(element);
          }).length > 0
        );
      },
      // Whether the authenticated user can execute mutations for a given
      // scheduled surface
      canWriteToSurface: (scheduledSurfaceGuid: string): boolean => {
        // Full access to everything is an automatic "Yes".
        if (hasFullAccess) {
          return true;
        }

        // Access to one or more scheduled surface means the user can create
        // and modify entities tied to that scheduled surface, such as prospects
        // or scheduled corpus items.
        const authGroupForScheduledSurface =
          getScheduledSurfaceByGuid(scheduledSurfaceGuid)?.accessGroup ||
          'NOT FOUND';

        return accessGroups.includes(authGroupForScheduledSurface);
      },
    };

    return user;
  }

  get eventEmitter(): CuratedCorpusEventEmitter {
    return this.config.eventEmitter;
  }

  emitReviewedCorpusItemEvent(
    event: ReviewedCorpusItemEventType,
    reviewedCorpusItem: ApprovedCorpusItemPayload | RejectedCorpusItemPayload,
  ): void {
    this.eventEmitter.emitEvent<ReviewedCorpusItemPayload>(event, {
      reviewedCorpusItem,
    });
  }

  emitScheduledCorpusItemEvent(
    event: ScheduledCorpusItemEventType,
    scheduledCorpusItem: ScheduledCorpusItemPayload,
  ): void {
    this.eventEmitter.emitEvent<ScheduledCorpusItemPayload>(
      event,
      scheduledCorpusItem,
    );
  }
}

/**
 * Context factory. Creates a new request context with
 * apollo compatible interface and default singleton
 * clients.
 * @returns AdminContextManager
 */
export async function getAdminContext({
  req,
}: {
  req: Express.Request;
}): Promise<AdminContextManager> {
  return new AdminContextManager({
    request: req,
    db: client(),
    s3,
    eventEmitter: curatedCorpusEventEmitter,
  });
}
