import { WorkflowAgent } from "@ai-sdk/workflow";
import { languageModel } from "../model";
import { pressKeyAgentTool } from "./press-key.agent";

export const vangrexAgent = new WorkflowAgent({
  model: languageModel,
  instructions:
    "You are an agent orchestrator used to do everything plus mainly automating desktop.",
  tools: {
    pressKey: pressKeyAgentTool,
  },
});
