export interface ParsedCitation {
  uuid: string;
  citationNumber: number;
  startIndex: number;
  endIndex: number;
}

export interface ParsedTextWithCitations {
  segments: Array<{
    text: string;
    citationNumber?: number;
    uuid?: string;
  }>;
  citations: ParsedCitation[];
  sourceIds: string[];
}

const UUID_REGEX = /\[([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/gi;

export function parseTextForCitations(text: string): ParsedTextWithCitations {
  const citations: ParsedCitation[] = [];
  const sourceIds: string[] = [];
  const segments: Array<{ text: string; citationNumber?: number; uuid?: string }> = [];

  let lastIndex = 0;
  let citationNumber = 1;
  let match: RegExpExecArray | null;

  const regex = new RegExp(UUID_REGEX);

  while ((match = regex.exec(text)) !== null) {
    const uuid = match[1];
    const matchStart = match.index;
    const matchEnd = regex.lastIndex;

    if (matchStart > lastIndex) {
      segments.push({
        text: text.substring(lastIndex, matchStart)
      });
    }

    citations.push({
      uuid,
      citationNumber,
      startIndex: matchStart,
      endIndex: matchEnd
    });

    if (!sourceIds.includes(uuid)) {
      sourceIds.push(uuid);
    }

    segments.push({
      text: `[${citationNumber}]`,
      citationNumber,
      uuid
    });

    lastIndex = matchEnd;
    citationNumber++;
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.substring(lastIndex)
    });
  }

  if (segments.length === 0) {
    segments.push({ text });
  }

  return {
    segments,
    citations,
    sourceIds
  };
}

export function hasUuidCitations(text: string): boolean {
  return UUID_REGEX.test(text);
}
