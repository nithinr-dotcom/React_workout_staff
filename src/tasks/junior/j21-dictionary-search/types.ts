export interface Meaning {
  partOfSpeech: string;
  definition: string;
}

/** Shape resolved by `lookupWord` in src/mocks/api.ts. */
export interface WordResult {
  word: string;
  meanings: Meaning[];
}

export interface DictionarySearchProps {
  /** Follow-up 1: when set, search automatically this many ms after the user stops typing. */
  searchAsYouTypeMs?: number;
}
