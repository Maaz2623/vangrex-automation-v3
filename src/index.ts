import { getWritable } from "workflow";
import { vangrexAgent } from "./agents/vangrex.agent";
import {
  createModelCallToUIChunkTransform,
  type ModelCallStreamPart,
} from "@ai-sdk/workflow";
import { createUIMessageStreamResponse } from "ai";

async function execute(query: string) {
  "use workflow";
  const result = await vangrexAgent.generate({
    prompt: query,
  });

  return {
    response: result.text,
  };
}

async function main() {
  const prompt = "Open windows settings with shortcuts";

  const run = await execute(prompt);

  console.log(run.response);
}

main();
