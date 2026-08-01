/** Wrap untrusted Weeek-sourced text so the model treats it as data, not instructions. */
export function wrapUntrusted(label: string, body: string): string {
  return [
    `<<<UNTRUSTED_WEEEK_DATA label="${label}">>>`,
    body,
    `<<<END_UNTRUSTED_WEEEK_DATA>>>`,
  ].join("\n");
}
