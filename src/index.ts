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
  const prompt = `Open the following apps with shortcuts:
  1. Notepad
2. Calculator
3. File Explorer
4. Task Manager
5. Command Prompt
6. Windows PowerShell
7. Control Panel
8. Settings
9. Snipping Tool
10. Registry Editor
  `;

  const run = await execute(prompt);

  console.log(run.response);
}

main();
