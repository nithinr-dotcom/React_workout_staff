/**
 * Splits a task README into the always-visible body and the hidden follow-ups.
 * Follow-ups live under a "## Follow-ups" heading as a numbered or bulleted list.
 */
export function splitReadme(markdown: string): { body: string; followUps: string[] } {
  const heading = /^##\s+Follow-ups\s*$/im;
  const match = heading.exec(markdown);
  if (!match) return { body: markdown, followUps: [] };

  const start = match.index;
  const afterHeading = start + match[0].length;
  const rest = markdown.slice(afterHeading);
  const nextHeading = /^##\s+/m.exec(rest);
  const sectionEnd = nextHeading ? afterHeading + nextHeading.index : markdown.length;

  const section = markdown.slice(afterHeading, sectionEnd);
  const body = (markdown.slice(0, start) + markdown.slice(sectionEnd)).trim();

  const followUps: string[] = [];
  for (const line of section.split('\n')) {
    const item = /^(?:\d+\.|[-*])\s+(.*)$/.exec(line);
    if (item) {
      followUps.push(item[1]);
    } else if (followUps.length && line.trim()) {
      followUps[followUps.length - 1] += '\n' + line.replace(/^\s{2,4}/, '');
    }
  }
  return { body, followUps };
}
