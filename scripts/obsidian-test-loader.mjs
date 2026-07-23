const obsidianMockUrl = new URL("./obsidian-test-mock.cjs", import.meta.url)
  .href;

export function resolve(specifier, context, nextResolve) {
  if (specifier === "obsidian") {
    return {
      shortCircuit: true,
      url: obsidianMockUrl,
    };
  }

  return nextResolve(specifier, context);
}
