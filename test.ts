import "dotenv/config";

import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import * as Terminator from "@mediar-ai/terminator";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import { languageModel } from "./src/model";
import { desktop } from "./src/desktop";

const MAX_STEPS = 20;

const SCREENSHOT_DIR = path.join(
  process.env.LOCALAPPDATA ?? "",
  "mediar",
  "executions",
);

type ScreenshotInfo = {
  path: string;
  modifiedAt: number;
};

async function findLatestScreenshot(
  directory: string,
): Promise<ScreenshotInfo | null> {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return null;
  }

  const candidates: ScreenshotInfo[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      const nested = await findLatestScreenshot(fullPath);
      if (nested) candidates.push(nested);
      continue;
    }

    if (!/\.(jpg|jpeg|png|webp)$/i.test(entry.name)) continue;

    try {
      const info = await stat(fullPath);
      candidates.push({
        path: fullPath,
        modifiedAt: info.mtimeMs,
      });
    } catch {
      // Ignore files that disappear during enumeration.
    }
  }

  candidates.sort((a, b) => b.modifiedAt - a.modifiedAt);
  return candidates[0] ?? null;
}

async function waitForScreenshot(
  previous: ScreenshotInfo | null,
  timeoutMs = 5000,
): Promise<ScreenshotInfo | null> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const latest = await findLatestScreenshot(SCREENSHOT_DIR);

    if (
      latest &&
      (!previous ||
        latest.path !== previous.path ||
        latest.modifiedAt > previous.modifiedAt)
    ) {
      console.log(`[SCREEN] ${latest.path}`);
      return latest;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const latest = await findLatestScreenshot(SCREENSHOT_DIR);

  if (latest) {
    console.log(`[SCREEN] Latest saved screenshot: ${latest.path}`);
  } else {
    console.log("[SCREEN] No saved screenshot found.");
  }

  return latest;
}

async function getUiTree(applicationName?: string) {
  if (applicationName) {
    const application = desktop.application(applicationName);
    application.activateWindow();

    const treeResult = desktop.getWindowTreeResult(
      application.processName(),
      undefined,
      {
        formatOutput: true,
        treeOutputFormat: Terminator.TreeOutputFormat.CompactYaml,
        propertyMode: Terminator.PropertyLoadingMode.Smart,
        includeWindowScreenshot: false,
        includeMonitorScreenshots: false,
      },
    );

    return {
      currentApplication: application.processName(),
      tree: treeResult.formatted,
    };
  }

  const application = await desktop.getCurrentApplication();

  const treeResult = desktop.getWindowTreeResult(
    application.processName(),
    undefined,
    {
      formatOutput: true,
      treeOutputFormat: Terminator.TreeOutputFormat.CompactYaml,
      propertyMode: Terminator.PropertyLoadingMode.Smart,
      includeWindowScreenshot: true,
      includeMonitorScreenshots: false,
    },
  );

  return {
    currentApplication: application.processName(),
    tree: treeResult.formatted,
  };
}

const tools = {
  pressKey: tool({
    description:
      "Press a keyboard shortcut using Terminator. Use only shortcuts; do not type arbitrary text. Examples: {Win}e, {Ctrl}{Shift}{Escape}, {Alt}{Tab}.",
    inputSchema: z.object({
      combination: z.string().describe("The keyboard shortcut to press."),
    }),
    execute: async ({ combination }) => {
      const previous = await findLatestScreenshot(SCREENSHOT_DIR);

      console.log(`\n[ACTION] Press shortcut: ${combination}`);

      await desktop.pressKey(combination, undefined, false, false);

      const screenshot = await waitForScreenshot(previous);

      return {
        message: "Keyboard shortcut executed.",
        combination,
        screenshot: screenshot?.path ?? null,
      };
    },
  }),

  clickBySelector: tool({
    description:
      "Click a visible UI element using its accessibility role and accessible name. Get the current UI tree first if the target is not known.",
    inputSchema: z.object({
      elementName: z.string().describe("Accessible name of the element."),
      elementRole: z
        .string()
        .describe("Accessibility role, such as button, tab, or menu item."),
      clickType: z
        .enum(["Double", "Left", "Right"])
        .default("Left")
        .describe("Type of click."),
    }),
    execute: async ({ elementName, elementRole, clickType }) => {
      const previous = await findLatestScreenshot(SCREENSHOT_DIR);

      console.log(
        `\n[ACTION] ${clickType} click: ${elementRole} "${elementName}"`,
      );

      const element = await desktop
        .locator(`role:${elementRole}|name:${elementName}`)
        .first(2000);

      // The supplied locator API exposes click() in your existing code.
      // If your installed version supports click options, map clickType
      // to its documented options to enable right/double clicking.
      if (clickType !== "Left") {
        return {
          message:
            "This locator implementation currently uses element.click() for left-clicks only. Use the documented click options in your installed Terminator version for right or double clicks.",
          elementName,
          elementRole,
        };
      }

      const result = await element.click();
      const screenshot = await waitForScreenshot(previous);

      return {
        message: "Clicked element.",
        elementName,
        elementRole,
        coordinates: result.coordinates,
        method: result.method,
        uiDiff: result.uiDiff?.diff,
        screenshot: screenshot?.path ?? null,
      };
    },
  }),

  getUiTree: tool({
    description:
      "Get the accessibility UI tree for the current application or a named application. Use this to identify real element roles and names before clicking.",
    inputSchema: z.object({
      applicationName: z
        .string()
        .optional()
        .describe("Optional application name to activate."),
    }),
    execute: async ({ applicationName }) => {
      console.log("\n[OBSERVE] Fetching UI tree");

      const result = await getUiTree(applicationName);

      console.log(`[APP] ${result.currentApplication}`);

      return {
        message: "Fetched the application UI tree.",
        currentApplication: result.currentApplication,
        tree: result.tree,
      };
    },
  }),

  getScreen: tool({
    description:
      "Find the latest screenshot saved by Terminator. Use after actions to locate the latest screen image. This returns a path, not screenshot image pixels.",
    inputSchema: z.object({}),
    execute: async () => {
      const screenshot = await findLatestScreenshot(SCREENSHOT_DIR);

      if (!screenshot) {
        return {
          message: "No saved Terminator screenshot was found.",
          screenshot: null,
        };
      }

      console.log(`\n[SCREEN] ${screenshot.path}`);

      return {
        message: "Located the latest Terminator screenshot.",
        screenshot: screenshot.path,
        modifiedAt: new Date(screenshot.modifiedAt).toISOString(),
      };
    },
  }),
};

async function main() {
  const goal = process.argv.slice(2).join(" ");

  if (!goal) {
    console.error(
      'Usage: bun run test.ts "Open Task Manager using a keyboard shortcut"',
    );
    process.exitCode = 1;
    return;
  }

  console.log("==================================");
  console.log("       VANGREX DESKTOP AGENT");
  console.log("==================================");
  console.log(`Goal: ${goal}`);

  const initialScreen = await findLatestScreenshot(SCREENSHOT_DIR);

  if (initialScreen) {
    console.log(`[INITIAL SCREEN] ${initialScreen.path}`);
  }

  const result = await generateText({
    model: languageModel,

    system: `
You are Vangrex, a Windows desktop automation agent.

Your goal is to execute the user's task using the provided Terminator tools.

Operating rules:
1. Observe the current application with getUiTree when you need to identify UI elements.
2. Use pressKey for keyboard shortcuts. Never use it to type arbitrary text.
3. Use clickBySelector with exact accessibility roles and names from the UI tree.
4. Use getScreen after actions when you need to locate the latest saved screenshot.
5. Do not invent element names, roles, coordinates, or screenshot contents.
6. A screenshot path does not mean you have visually inspected the screenshot.
7. Perform only actions relevant to the user's goal.
8. Stop when the task is complete. Clearly report any limitation or failure.
9. Do not claim success merely because an action was attempted.
10. Avoid repeating an action if its outcome is uncertain; observe the UI first.
`,

    prompt: goal,

    tools,

    stopWhen: stepCountIs(MAX_STEPS),
  });

  console.log("\n==================================");
  console.log("           AGENT RESULT");
  console.log("==================================");
  console.log(result.text);

  const finalScreen = await findLatestScreenshot(SCREENSHOT_DIR);

  if (finalScreen) {
    console.log("\n[FINAL SCREEN]");
    console.log(finalScreen.path);
  }
}

main().catch((error) => {
  console.error("\n[VANGREX ERROR]", error);
  process.exitCode = 1;
});
