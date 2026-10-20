import { WorkflowAgent } from "@ai-sdk/workflow";
import { languageModel } from "../model";
import { pressKeyAgentTool } from "./press-key.agent";
import { uiProbeAgentTool } from "./ui-probe.agent";
import { mousePilotAgentTool } from "./mouse-pilot.agent";

export const vangrexAgent = new WorkflowAgent({
  model: languageModel,
  instructions:
    "You are an agent orchestrator used to do everything plus mainly automating desktop.",
  tools: {
    pressKey: pressKeyAgentTool,
    getUiTree: uiProbeAgentTool,
    mousePilot: mousePilotAgentTool
  },
});
