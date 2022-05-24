const notionCalloutPattern = />\s(ℹ️|⚠️|💡|❗|🔥)\s(.*)\n/gmu;
const calloutsToAdmonitions = {
  /* prettier-ignore */ "ℹ️": "note",
  "💡": "tip",
  "❗": "info",
  "⚠️": "caution",
  "🔥": "danger",
};

export function tweakForDocusaurus(input: string): string {
  let output = input;
  let match;
  while ((match = notionCalloutPattern.exec(input)) !== null) {
    const string = match[0];
    const emoji = match[1] as keyof typeof calloutsToAdmonitions;
    const content = match[2];

    const docusaurusAdmonition = calloutsToAdmonitions[emoji];
    if (docusaurusAdmonition) {
      output = output.replace(
        string,
        `${docusaurusAdmonition}:::\n\n${content}\n\n:::\n\n`
      );
    }
  }

  return output;
}
