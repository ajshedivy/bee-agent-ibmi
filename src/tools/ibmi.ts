/* eslint-disable @typescript-eslint/no-unused-vars */
import { GetRunContext } from "bee-agent-framework/context";
import { AnyToolSchemaLike, FromSchemaLike } from "bee-agent-framework/internals/helpers/schema";
import {
  Tool,
  ToolInput,
  ToolError,
  BaseToolOptions,
  BaseToolRunOptions,
  JSONToolOutput,
} from "bee-agent-framework/tools/base";
import { Provider, getMetadata } from "bee-agent-framework/tools/database/metadata";
import mapepire, { SQLJob } from "@ibm/mapepire-js";
import { Cache } from "bee-agent-framework/cache/decoratorCache";
import { DaemonServer } from "@ibm/mapepire-js/dist/src/types.js";
import { Query } from "@ibm/mapepire-js/dist/src/query.js";
import { z } from "zod";

interface MapepireOptions extends DaemonServer {
  schema: string;
}

interface ToolOptions extends BaseToolOptions {
  provider: "ibmi";
  connection: MapepireOptions;
}
type ToolRunOptions = BaseToolRunOptions;

export class IBMiTool extends Tool<JSONToolOutput<any>, ToolOptions, ToolRunOptions> {
  name = "IBMiTool";
  description = "Converts natural language to SQL query and executes it on Db2 for i";

  public constructor(options: ToolOptions) {
    super(options);
    if (!options.connection.schema) {
      throw new Error(`Schema is required!`);
    }
  }

  static {
    this.register();
  }

  protected async setSchema(job: SQLJob, schema: string) {
    const sql = `SET CURRENT SCHEMA ${schema}`;
    const query = await job.query(sql);
    await query.execute();
  }

  @Cache()
  protected async connection(): Promise<mapepire.SQLJob> {
    const job = new mapepire.SQLJob();
    try {
      await job.connect(this.options.connection);
      await this.setSchema(job, this.options.connection.schema);
      return job;
    } catch (e) {
      throw new ToolError(`Unable to connect to Db2 for i: ${e}`, [], {
        isRetryable: false,
        isFatal: true,
      });
    }
  }

  inputSchema() {
    return z.object({
      query: z.string({ description: "The SQL query to be executed." }).min(1),
    });
  }

  protected async _run(
    { query }: ToolInput<this>,
    _options?: ToolRunOptions,
  ): Promise<JSONToolOutput<any>> {
    if (!this.isReadOnlyQuery(query)) {
      return new JSONToolOutput({
        success: false,
        error: "Invalid query. Only SELECT queries are allowed.",
      });
    }
    let metaData = "";
    const job = await this.connection();
    const schema = this.options.connection.schema;

    try {
      metaData = await this.getIBMiMetaData();
      const query_object: Query<any> = await job.query<any>(query);
      const result = await query_object.execute();
      if (result.has_results && result.success) {
        return new JSONToolOutput({ success: true, result: result.data });
      } else {
        return new JSONToolOutput({
          success: false,
          message: `No rows selected`,
        });
      }
    } catch (error) {
      const errorMessage = `Based on this database schema structure: ${metaData}, 
      generate a correct query that retrieves data using the appropriate ibmi dialect. 
      The original request was: ${query}, and the error was: ${error.message}.`;

      throw new ToolError(errorMessage);
    }
  }

  async getIBMiMetaData(): Promise<string> {
    const job = await this.connection();
    const schema = this.options.connection.schema;
    const sql = `
      SELECT COLUMN_NAME, TABLE_NAME, DATA_TYPE
      FROM QSYS2.SYSCOLUMNS
      WHERE TABLE_SCHEMA = '${schema.toUpperCase()}'
    `;

    try {
      const query = await job.query<any>(sql);
      const metaData = await query.execute();
      // console.log(metaData);
      const tableMap = new Map<string, string[]>();

      for (const item of metaData.data) {
        const tableName = item["TABLE_NAME"];
        const columnName = item["COLUMN_NAME"];
        const dataType = item["DATA_TYPE"];
        // console.log(tableName, columnName, dataType);
        if (!tableMap.has(tableName)) {
          tableMap.set(tableName, [
            `Table '${tableName}' with columns: ${columnName} (${dataType})`,
          ]);
        } else {
          tableMap.get(tableName)!.push(`${columnName} (${dataType})`);
        }
      }

      return Array.from(tableMap.values())
        .map((columns) => columns.join(", "))
        .join("; ");
    } catch (error) {
      throw new ToolError(`Error initializing metadata: ${error}`, [], {
        isRetryable: false,
      });
    }
  }

  private isReadOnlyQuery(query: string): boolean {
    const normalizedQuery = query.trim().toUpperCase();
    return (
      normalizedQuery.startsWith("SELECT") ||
      normalizedQuery.startsWith("SHOW") ||
      normalizedQuery.startsWith("DESC")
    );
  }

  public async destroy(): Promise<void> {
    // @ts-expect-error protected property
    const cache = Cache.getInstance(this, "connection");
    const entry = cache.get();

    if (entry) {
      cache.clear();

      try {
        await entry.data.close();
      } catch (error) {
        throw new ToolError(`Failed to close the database connection`, [error]);
      }
    }
  }
}
