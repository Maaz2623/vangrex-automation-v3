import { WorkflowAgent } from "@ai-sdk/workflow";
import { languageModel } from "../model";
import { pressKeyAgentTool } from "./press-key.agent";
import { uiProbeAgentTool } from "./ui-probe.agent";
import { mousePilotAgentTool } from "./mouse-pilot.agent";
import { isStepCount, tool, ToolLoopAgent } from "ai";
import z from "zod";
import { desktop } from "../desktop";
import * as Terminator from "@mediar-ai/terminator";

export const vangrexAgent = new ToolLoopAgent({
  model: languageModel,
  instructions:
    "You are an agent orchestrator used to do everything plus mainly automating desktop. Use applicationName as This PC for file explorer interactions. To find applications search it in start menu, if it doesn't appear as an app report that it is not installed, don't workaround to confirm by more steps.",
  stopWhen: isStepCount(100),
  tools: {
    pressKey: tool({
      description: "Use to press key or combination of keyboard keys.",
      inputSchema: z.object({
        combination: z
          .string()
          .describe(
            "Combination of keys or a single key. example: `{Shift}m` or `{Win}e` or `{Ctrl}{Shift}{Escape}` to open task manager and etc.",
          ),
      }),
      execute: async ({ combination }) => {
        await desktop.pressKey(combination, undefined, false, false);

        return {
          message: `Pressed ${combination}`,
        };
      },
    }),
    get_ui_tree: tool({
      description: "Use to get the ui tree of a running application.",
      inputSchema: z.object({
        applicationName: z
          .string()
          .describe(
            "An optional value that is passed to verify and get the ui tree. Example: to focus or open the application first.",
          ),
      }),
      execute: async ({ applicationName }) => {
        const application = desktop.application(applicationName);

        const treeResult = desktop.getWindowTreeResult(
          application.processName(),
          applicationName,
          {
            formatOutput: true,
            treeOutputFormat: Terminator.TreeOutputFormat.CompactYaml,
            propertyMode: Terminator.PropertyLoadingMode.Fast,
            includeWindowScreenshot: false,
            includeMonitorScreenshots: false,
          },
        );

        return {
          message: "Fetched the UI Tree",
          currentApplication: application.processName(),
          tree: treeResult.formatted,
        };
      },
    }),
    click_by_selector: tool({
      description: "You click by using the selector of the element",
      inputSchema: z.object({
        elementName: z.string().describe("Name of the element"),
        elementRole: z.string().describe("Role of the element"),
        clickType: z
          .enum(["Double", "Left", "Right"])
          .default("Left")
          .describe("Type of click. Either Double, Left or Right"),
      }),
      execute: async ({ clickType, elementName, elementRole }) => {
        const element = await desktop
          .locator(`role:${elementRole}|name:${elementName}`)
          .first(2000);

        const click = await element.click();

        return {
          message: "Clicked",
          coordinates: click.coordinates,
          method: click.method,
          uiDiff: click.uiDiff?.diff,
        };
      },
    }),
    typing: tool({
      description: "Use to type stuff into focused elements",
      inputSchema: z.object({
        text: z.string().describe("The text type"),
        elementName: z
          .string()
          .describe("The name of the element to focus and type in."),
        elementRole: z
          .string()
          .describe("The role of the element to focus and type in."),
      }),
      execute: async ({ text, elementName, elementRole }) => {
        const element = await desktop
          .locator(`role:${elementRole}|name:${elementName}`)
          .first(2000);

        element.focus();

        const type = element.typeText(text);

        return {
          message: `Typed: ${text}`,
          uiChanged: type.uiDiff?.hasChanges,
          success: type.success,
        };
      },
    }),
  },
});
