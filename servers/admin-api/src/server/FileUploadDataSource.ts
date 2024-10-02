import {
  GraphQLDataSourceProcessOptions,
  RemoteGraphQLDataSource,
} from '@apollo/gateway';
import { GraphQLResponse } from 'apollo-server-types';
import { FileUpload, Upload } from 'graphql-upload/Upload.js';
import { Headers, Response } from 'apollo-server-env';
import { isObject } from '@apollo/gateway/dist/utilities/predicates';

import { cloneDeep, set } from 'lodash';
import { Request } from 'node-fetch';
import FormData from './FormData';
import ProfusionFileUploadDataSource from '@profusion/apollo-federation-upload';

/**
 * These types and functions below are copied from the library as well.
 * Since they're not class members and aren't exported, I had to copy them
 */
type FileVariablesTuple = [string, Promise<FileUpload>];
type Variables = Record<string, unknown> | null;
type AddDataHandler = (
  form: FormData,
  resolvedFiles: FileUpload[],
) => Promise<void | void[]>;

type ConstructorArgs = Exclude<
  ConstructorParameters<typeof RemoteGraphQLDataSource>[0],
  undefined
>;

export type FileUploadDataSourceArgs = ConstructorArgs & {
  useChunkedTransfer?: boolean;
};

const addChunkedDataToForm: AddDataHandler = (
  form: FormData,
  resolvedFiles: FileUpload[],
): Promise<void> => {
  resolvedFiles.forEach(
    ({ createReadStream, filename, mimetype: contentType }, i: number) => {
      form.append(i.toString(), createReadStream(), {
        contentType,
        filename,
        /*
            Set knownLength to NaN so node-fetch does not set the
            Content-Length header and properly set the enconding
            to chunked.
            https://github.com/form-data/form-data/pull/397#issuecomment-471976669
          */
        knownLength: Number.NaN,
      });
    },
  );
  return Promise.resolve();
};

const addDataToForm: AddDataHandler = (
  form: FormData,
  resolvedFiles: FileUpload[],
): Promise<void[]> => {
  return Promise.all(
    resolvedFiles.map(
      async (
        { createReadStream, filename, mimetype: contentType },
        i: number,
      ): Promise<void> => {
        const fileData = await new Promise<Buffer>((resolve, reject) => {
          const stream = createReadStream();
          const buffers: Buffer[] = [];
          stream.on('error', reject);
          stream.on('data', (data: Buffer) => {
            buffers.push(data);
          });
          stream.on('end', () => {
            resolve(Buffer.concat(buffers));
          });
        });
        form.append(i.toString(), fileData, {
          contentType,
          filename,
          knownLength: fileData.length,
        });
      },
    ),
  );
};

/**
 * This class is extending the FileUploadDataSource class from the @profusion/apollo-federation-upload package
 * The reason we are doing this is because this library's current version is not compatible with federation 2.0.
 * The image uploads are broken. However, there is a fix that has been approved for this library but hasn't been merged.
 * Since that stops us from using `csrfPrevention`, we have decided to temporarily extend the library's class and implement the change
 * that hasn't been officially merged into library's main branch.
 */

export default class FileUploadDataSource extends ProfusionFileUploadDataSource {
  constructor(config?: FileUploadDataSourceArgs) {
    super(config);

    const useChunkedTransfer = config?.useChunkedTransfer ?? true;
    this.customAddDataHandler = useChunkedTransfer
      ? addChunkedDataToForm
      : addDataToForm;
  }

  // re-initializing this because it's a private member in the base class so can't override it
  private customAddDataHandler: AddDataHandler;

  // re-initializing this because it's a private member in the base class so can't override it
  private static customExtractFileVariables(
    rootVariables?: Variables,
  ): FileVariablesTuple[] {
    const extract = (
      variables?: Variables,
      prefix?: string,
    ): FileVariablesTuple[] => {
      return Object.entries(variables || {}).reduce(
        (acc: FileVariablesTuple[], [name, value]): FileVariablesTuple[] => {
          const p = prefix ? `${prefix}.` : '';
          const key = `${p}${name}`;
          if (value instanceof Promise || value instanceof Upload) {
            acc.push([
              key,
              value instanceof Upload ? (value as Upload).promise : value,
            ]);
            return acc;
          }
          if (Array.isArray(value)) {
            const [first] = value;
            if (first instanceof Promise || first instanceof Upload) {
              return acc.concat(
                value.map(
                  (
                    v: Promise<FileUpload> | Upload,
                    idx: number,
                  ): FileVariablesTuple => [
                    `${key}.${idx}`,
                    v instanceof Upload ? v.promise : v,
                  ],
                ),
              );
            }
            if (isObject(first)) {
              return acc.concat(
                ...value.map(
                  (v: Variables, idx: number): FileVariablesTuple[] =>
                    extract(v, `${key}.${idx}`),
                ),
              );
            }
            return acc;
          }
          if (isObject(value)) {
            return acc.concat(extract(value as Variables, key));
          }
          return acc;
        },
        [],
      );
    };
    return extract(rootVariables);
  }

  async process(
    args: GraphQLDataSourceProcessOptions,
  ): Promise<GraphQLResponse> {
    const fileVariables = FileUploadDataSource.customExtractFileVariables(
      args.request.variables,
    );
    if (fileVariables.length > 0) {
      return this.customProcessFiles(args, fileVariables);
    }
    return super.process(args);
  }

  // re-initializing this because it's a private member in the base class so can't override it
  protected async customProcessFiles(
    args: GraphQLDataSourceProcessOptions,
    fileVariables: FileVariablesTuple[],
  ): Promise<GraphQLResponse> {
    const { context, request } = args;
    const form = new FormData();

    const variables = cloneDeep(request.variables || {});
    fileVariables.forEach(([variableName]: FileVariablesTuple): void => {
      set(variables, variableName, null);
    });

    const operations = JSON.stringify({
      query: request.query,
      variables,
    });

    form.append('operations', operations);

    const fileMap: { [key: string]: string[] } = {};

    const resolvedFiles: FileUpload[] = await Promise.all(
      fileVariables.map(
        async (
          [variableName, file]: FileVariablesTuple,
          i: number,
        ): Promise<FileUpload> => {
          const fileUpload: FileUpload = await file;
          fileMap[i] = [`variables.${variableName}`];
          return fileUpload;
        },
      ),
    );

    // This must come before the file contents append bellow
    form.append('map', JSON.stringify(fileMap));
    await this.customAddDataHandler(form, resolvedFiles);

    const headers = (request.http && request.http.headers) || new Headers();

    Object.entries(form.getHeaders() || {}).forEach(([k, value]) => {
      headers.set(k, value);
    });

    request.http = {
      headers,
      method: 'POST',
      url: this.url,
    };

    if (this.willSendRequest) {
      await this.willSendRequest(args);
    }

    const options = {
      ...request.http,
      // Apollo types are not up-to-date, make TS happy
      body: form as unknown as string,
      // All of this copying for this one line change
      headers: Object.fromEntries(request.http.headers),
    };

    const httpRequest = new Request(request.http.url, options);
    let httpResponse: Response | undefined;

    try {
      httpResponse = await this.fetcher(request.http.url, options);

      const body = await this.parseBody(httpResponse);

      if (!isObject(body)) {
        throw new Error(`Expected JSON response body, but received: ${body}`);
      }
      const response = {
        ...body,
        http: httpResponse,
      };

      if (typeof this.didReceiveResponse === 'function') {
        return this.didReceiveResponse({ context, request, response });
      }

      return response;
    } catch (error) {
      this.didEncounterError(error as Error, httpRequest, httpResponse);
      throw error;
    }
  }
}
