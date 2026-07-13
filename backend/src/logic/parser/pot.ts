// Parses the standard gettext .pot format used by the game's localization
// files. Entries look like:
//   msgctxt "desc/squad/squad_officer_con(ger)"
//   msgid "Officer Squad"
//   msgstr ""
// We only need msgctxt -> msgid (the English source text; msgstr is the
// translation slot, empty in the "default"/English pot files).
export function parsePot(text: string): Map<string, string> {
  const entries = new Map<string, string>();
  const pattern = /msgctxt "([^"]*)"\nmsgid "([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    // keys are matched case-insensitively elsewhere (the game's own data
    // has inconsistent casing, e.g. "Officer" vs "officer"), so store
    // lowercased here and let callers lowercase their lookup key too.
    entries.set(match[1].toLowerCase(), match[2]);
  }
  return entries;
}
