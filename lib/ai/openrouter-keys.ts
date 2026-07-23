export function getOpenRouterKeys() {
  return [
    process.env.OPENROUTER_API_KEY,
    process.env.OPEN_ROUTER_API_KEY,
    process.env.OPENROUTER_API_KEY_2,
    process.env.OPENROUTER_API_KEY_3,
    process.env.OPENROUTER_API_KEY_4,
    process.env.OPENROUTER_API_KEY_5,
    process.env.OPENROUTER_API_KEY_6,
    process.env.OPENROUTER_API_KEY_7,
    process.env.OPENROUTER_API_KEY_8,
    process.env.OPENROUTER_API_KEY_9,
    process.env.OPENROUTER_API_KEY_10
  ]
    .map((key) => key?.trim())
    .filter((key): key is string => Boolean(key));
}

export function hasOpenRouterKey() {
  return getOpenRouterKeys().length > 0;
}

export function isOpenRouterKeyLimitError(status: number, detail = "") {
  return (
    status === 401 ||
    status === 402 ||
    status === 403 ||
    status === 429 ||
    /rate|quota|credit|limit|auth|key/i.test(detail)
  );
}
