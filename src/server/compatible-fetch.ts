// Groq rejects a strict tool schema whose `properties` is empty while
// `required` is present, a shape OpenAI accepts and the strict converter emits
// for parameterless tools. Drop that empty `required` before the request leaves.
export const compatibleFetch: typeof fetch = (input, init) => {
  if (typeof init?.body !== 'string' || !init.body.includes('"tools"'))
    return fetch(input, init);
  try {
    const body = JSON.parse(init.body) as {
      tools?: { function?: { parameters?: Record<string, unknown> } }[];
    };
    for (const tool of body.tools ?? []) {
      const parameters = tool.function?.parameters;
      if (
        parameters &&
        Array.isArray(parameters.required) &&
        parameters.required.length === 0 &&
        Object.keys(parameters.properties ?? {}).length === 0
      )
        delete parameters.required;
    }
    return fetch(input, { ...init, body: JSON.stringify(body) });
  } catch {
    return fetch(input, init);
  }
};
