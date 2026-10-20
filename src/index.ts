import { vangrexAgent } from "./agents/vangrex.agent";

async function execute(query: string) {
  "use workflow";
  const result = await vangrexAgent.generate({
    prompt: query,
  });

  return {
    response: result.text,
    toolUsage: result.toolResults,
    tokenUsage: result.usage.inputTokens,
  };
}

async function main() {
  const prompt = `Open explorer and click on downloads. Right click and delete fira code.
  `;

  const run = await execute(prompt);

  console.log(run.response);
  console.log(run.toolUsage);
  console.log("Tokens: ", run.tokenUsage);
}

main();
