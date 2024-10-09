import { typeDefsPublic } from '../typeDefs';
import { resolvers } from './resolvers';
import { buildSubgraphSchema } from '@apollo/subgraph';

export const schema = buildSubgraphSchema({
  typeDefs: typeDefsPublic,
  resolvers,
});
