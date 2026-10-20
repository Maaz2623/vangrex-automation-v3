import { desktop } from "./src/desktop";
import * as Terminator from "@mediar-ai/terminator";

async function main() {
  const processName = "explorer.exe";

  console.log("Finding File Explorer windows...\n");

  // Enumerate windows using the process name.
  const windows = await desktop.windowsForApplication(processName);

  console.log("Windows returned:", windows.length);

  for (const window of windows) {
    console.log(window);
  }

  console.log("\nGetting UI tree for the This PC window...\n");

  // Target the File Explorer window by its shell location title.
  const result = await desktop.getWindowTreeResult(processName, "This PC", {
    formatOutput: true,
    treeOutputFormat: Terminator.TreeOutputFormat.CompactYaml,
    propertyMode: Terminator.PropertyLoadingMode.Smart,
    includeWindowScreenshot: false,
    includeMonitorScreenshots: false,
  });

  console.log(result.formatted);
}

main().catch((error) => {
  console.error("Failed to inspect File Explorer:", error);
});
