import { vangrexAgent } from "./agents/vangrex.agent";

async function execute(query: string) {
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
  const prompt = `Search for notepad and open it if its installed.
  `;

  const run = await execute(prompt);

  console.log(run.response);
  console.log(run.toolUsage);
  console.log("Tokens: ", run.tokenUsage);
}

main();
