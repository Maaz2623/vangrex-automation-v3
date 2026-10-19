import { tool, ToolLoopAgent } from "ai";
import { languageModel } from "../model";
import z from "zod";
import { desktop } from "../desktop";

export const pressKeyAgent = new ToolLoopAgent({
  model: languageModel,
  instructions:
    "You are responsible for pressing keys such as shortcuts.example: `{Shift}m` or `{Win}e` or `{Ctrl}{Shift}{Escape}` to open task manager and etc.",
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
        await desktop.pressKey(combination);
      },
    }),
  },
});

export const pressKeyAgentTool = tool({
  description: "Use to press key or combination of keys.",
  inputSchema: z.object({
    combination: z
      .string()
      .describe(
        "Use for pressing keys such as shortcuts. example: `{Shift}m` or `{Win}e` or `{Ctrl}{Shift}{Escape}` to open task manager and etc.",
      ),
  }),
  execute: async ({ combination }) => {
    const result = await pressKeyAgent.generate({
      prompt: combination,
    });

    return result.content;
  },
});
