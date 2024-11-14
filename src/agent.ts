import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { FrameworkError } from "bee-agent-framework/errors";
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import "dotenv/config.js";
import * as process from "node:process";
import { getChatLLM } from "./helpers/llm.js";
import { getPrompt } from "./helpers/prompt.js";
import { IBMiTool } from "./tools/ibmi.js";
import {
  BeeSystemPrompt,
  BeeToolErrorPrompt,
  BeeToolInputErrorPrompt,
  BeeToolNoResultsPrompt,
} from "bee-agent-framework/agents/bee/prompts";
import { PromptTemplate } from "bee-agent-framework";
import { z } from "zod";
import { DaemonServer } from "@ibm/mapepire-js/dist/src/types.js";

const ENV_CREDS: DaemonServer = {
  host: process.env.HOST || `localhost`,
  port: Number(process.env.PORT) || 8076,
  user: process.env.DB_USER || "",
  password: process.env.PASSWORD || "",
};

const llm = getChatLLM();

const ibmiTool = new IBMiTool({
  provider: "ibmi",
  connection: {
    ...ENV_CREDS,
    schema: process.env.SCHEMA || "SAMPLE",
    ignoreUnauthorized: true,
  },
});

const metaData = await ibmiTool.getIBMiMetaData();

const agent = new BeeAgent({
  llm,
  memory: new TokenMemory({ llm }),
  // You can override internal templates
  templates: {
    user: new PromptTemplate({
      schema: z
        .object({
          input: z.string(),
        })
        .passthrough(),
      template: `User: {{input}}`,
    }),
    system: BeeSystemPrompt.fork((old) => ({
      ...old,
      defaults: {
        instructions: `You are a helpful Db2 for i assistant that uses SQL tools to answer questions. Use the following meta data for creating SQL queries: ${metaData}`,
      },
    })),
    toolError: BeeToolErrorPrompt,
    toolInputError: BeeToolInputErrorPrompt,
    toolNoResultError: BeeToolNoResultsPrompt.fork((old) => ({
      ...old,
      template: `${old.template}\nPlease reformat your input.`,
    })),
    toolNotFoundError: new PromptTemplate({
      schema: z
        .object({
          tools: z.array(z.object({ name: z.string() }).passthrough()),
        })
        .passthrough(),
      template: `Tool does not exist!
{{#tools.length}}
Use one of the following tools: {{#trim}}{{#tools}}{{name}},{{/tools}}{{/trim}}
{{/tools.length}}`,
    }),
  },
  tools: [ibmiTool],
});

try {
  const prompt = getPrompt(`What is the current weather in Las Vegas?`);
  console.info(`User 👤 : ${prompt}`);

  const response = await agent
    .run(
      { prompt: `From the Db2 for i database: ${prompt}` },
      {
        execution: {
          maxIterations: 15,
          maxRetriesPerStep: 5,
          totalMaxRetries: 10,
        },
      },
    )
    .observe((emitter) => {
      emitter.on("update", (data) => {
        console.info(`Agent 🤖 (${data.update.key}) : ${data.update.value}`);
      });
      emitter.on("error", ({ error }) => {
        console.log(`Agent 🤖 : `, FrameworkError.ensure(error).dump());
      });
      emitter.on("retry", () => {
        console.log(`Agent 🤖 : `, "retrying the action...");
      });
    });
  console.info(`Agent 🤖 : ${response.result.text}`);
} catch (error) {
  console.error(FrameworkError.ensure(error).dump());
} finally {
  await ibmiTool.destroy();
  process.exit(0);
}
