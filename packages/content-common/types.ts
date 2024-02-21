type ApprovedItemAuthor = {
    name: string;
    sortOrder: number;
};

enum CorpusItemSource {
    PROSPECT = 'PROSPECT', //  originated as a prospect in the curation admin tool
    MANUAL = 'MANUAL', // manually entered through the curation admin tool
    BACKFILL = 'BACKFILL', // imported from the legacy database
}

enum CuratedStatus {
    RECOMMENDATION = 'RECOMMENDATION',
    CORPUS = 'CORPUS'
}

type ApprovedItemRequiredInput = {
    prospectId?: string;
    title: string;
    excerpt: string;
    authors: ApprovedItemAuthor[];
    status: CuratedStatus;
    language: string;
    publisher: string;
    imageUrl: string;
    topic: string;
    source: CorpusItemSource;
    isTimeSensitive: boolean;
};

export type CreateApprovedItemInput = ApprovedItemRequiredInput & {
    // These required properties are set once only at creation time
    // and never changed, so they're not part of the shared input type above.
    url: string;
    isCollection: boolean;
    isSyndicated: boolean;
    // These are optional properties for approving AND scheduling the item
    // on a Scheduled Surface at the same time.
    scheduledDate?: string;
    scheduledSurfaceGuid?: string;
};