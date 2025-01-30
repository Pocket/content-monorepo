import { gql } from 'graphql-tag';
import { BaseSectionData, BaseSectionItemData, CorpusItemData } from '../../shared/fragments.gql';

export const PublicSectionItemData = gql`
    fragment PublicSectionItemData on SectionItem {
        ...BaseSectionItemData
        corpusItem {
            ...CorpusItemData
        }
    }
    ${BaseSectionItemData}
    ${CorpusItemData}
`;

export const PublicSectionData = gql`
    fragment PublicSectionData on Section {
        ...BaseSectionData
        sectionItems {
            ...PublicSectionItemData
        }
    }
    ${BaseSectionData}
    ${PublicSectionItemData}
`;