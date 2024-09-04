import { schema } from './schema';
import { printSubgraphSchema } from '@apollo/subgraph';
import path from 'path';
import fs from 'fs';

// this file writes the stitched together schema (shared + admin)
// out to a file for the purposes of performing apollo checks
// during CI operations.

const sdl = printSubgraphSchema(schema);

const filePath = path.resolve(__dirname, '../..', 'schema-admin-api.graphql');

fs.writeFileSync(filePath, sdl);
