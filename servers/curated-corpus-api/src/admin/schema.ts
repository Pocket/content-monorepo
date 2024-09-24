import { typeDefsAdmin } from '../typeDefs';
import { resolvers } from './resolvers';
import { buildSubgraphSchema } from '@apollo/subgraph';

export const schema = buildSubgraphSchema({
  typeDefs: typeDefsAdmin,
  resolvers,
});
