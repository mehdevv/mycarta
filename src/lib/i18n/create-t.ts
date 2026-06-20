type NestedMessages = { [key: string]: string | NestedMessages };

function getByPath(obj: NestedMessages, path: string): string {
  const value = path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object") {
      return (current as NestedMessages)[key];
    }
    return undefined;
  }, obj);
  return typeof value === "string" ? value : path;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  let text = template;
  for (const [key, value] of Object.entries(params)) {
    text = text.replaceAll(`{${key}}`, String(value));
  }
  return text;
}

export function createT(messages: NestedMessages) {
  return (key: string, params?: Record<string, string | number>) =>
    interpolate(getByPath(messages, key), params);
}

export type TFunction = ReturnType<typeof createT>;
