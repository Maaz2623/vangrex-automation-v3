import { WorkflowAgent } from "@ai-sdk/workflow";
import { tool, ToolLoopAgent } from "ai";
import { languageModel } from "../model";
import z from "zod";
import * as Terminator from "@mediar-ai/terminator";
import { desktop } from "../desktop";

const uiProbeAgent = new WorkflowAgent({
  model: languageModel,
  instructions:
    "You are responsible only for getting the ui tree of an app or desktop or an application that is running.",
  tools: {
    get_ui_tree: tool({
      description: "Use to get the ui tree of a running application.",
      inputSchema: z.object({
        applicationName: z
          .string()
          .optional()
          .describe(
            "An optional value that is passed to verify and get the ui tree. Example: to focus or open the application first.",
          ),
        windowTitle: z
          .string()
          .describe("The exact window title. use This PC for explorer stuff."),
      }),
      execute: async ({ applicationName, windowTitle }) => {
        if (applicationName) {
          const application = desktop.application(applicationName);

          const treeResult = desktop.getWindowTreeResult(
            application.processName(),
            windowTitle.trim() || undefined,
            {
              formatOutput: true,
              treeOutputFormat: Terminator.TreeOutputFormat.CompactYaml,
              propertyMode: Terminator.PropertyLoadingMode.Smart,
            },
          );

          return {
            message: "Fetched the application ui tree.",
            tree: treeResult.formatted,
          };
        }

        const application = await desktop.getCurrentApplication();

        const treeResult = desktop.getWindowTreeResult(
          application.processName(),
          windowTitle.trim() || undefined,
          {
            formatOutput: true,
            treeOutputFormat: Terminator.TreeOutputFormat.CompactYaml,
            propertyMode: Terminator.PropertyLoadingMode.Smart,
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
