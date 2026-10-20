import { desktop } from "./src/desktop";
import * as Terminator from "@mediar-ai/terminator";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

await sleep(2000);

const application = await desktop.application("This PC");

console.log(application.window());

const tree = await desktop.getWindowTreeResult(
  application.processName(),
  application.name(),
  {
    formatOutput: true,
    treeOutputFormat: Terminator.TreeOutputFormat.CompactYaml,
    propertyMode: Terminator.PropertyLoadingMode.Fast,
  },
);

console.log(tree.formatted);
