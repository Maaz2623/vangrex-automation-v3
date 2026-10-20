import { WorkflowAgent } from "@ai-sdk/workflow";
import { languageModel } from "../model";
import { tool } from "ai";
import z from "zod";
import { desktop } from "../desktop";
import type { ClickType } from "@mediar-ai/terminator";

const mousePilotAgent = new WorkflowAgent({
  instructions: "You are responsible for handling the mouse interactions.",
  model: languageModel,
  tools: {
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
  },
});

export const mousePilotAgentTool = tool({
  description: "Use to perform mouse operations.",
  inputSchema: z.object({
    elementName: z.string().describe("Name of the element."),
    elementIndex: z.number().describe("Element index"),
  }),
  execute: async ({ elementName, elementIndex }) => {
    const result = await mousePilotAgent.generate({
      prompt: `Click on ${elementName} with index value ${elementIndex}`,
    });

    return {
      message: result.text,
    };
  },
});
