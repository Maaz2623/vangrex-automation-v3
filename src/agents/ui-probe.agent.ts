import { WorkflowAgent } from "@ai-sdk/workflow";
import { tool, ToolLoopAgent } from "ai";
import { languageModel } from "../model";
import z from "zod";
import * as Terminator from "@mediar-ai/terminator";
import { desktop } from "../desktop";

const uiProbeAgent = new ToolLoopAgent({
  model: languageModel,
  instructions:
    "You are responsible only for getting the ui tree of an app or desktop or an application that is running. Use applicationName as This PC for file explorer",
  tools: {
    
  },
});

export const uiProbeAgentTool = tool({
  description:
    "Use to get the ui tree of a specific appplication or the currently running application. Try window title. Use This PC for explorer related stuff",
  inputSchema: z.object({
    task: z.string().describe("The tree related tasks to perform"),
  }),
  execute: async ({ task }) => {
    const result = await uiProbeAgent.generate({
      prompt: task,
    });

    return {
      message: result.text,
    };
  },
});
