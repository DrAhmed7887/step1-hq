import coachQuotes from "../data/coachQuotes.json" with { type: "json" };

const BATTLE_PROBABILITY = 0.3;
const UNIVERSAL_CATEGORY = "battle";

export function quoteKey(quote) {
  return `${quote.source}::${quote.text}`;
}

export function getQuotesForCategory(category) {
  return coachQuotes.filter((quote) => quote.category === category);
}

export function getQuoteByKey(key) {
  return coachQuotes.find((quote) => quoteKey(quote) === key) || null;
}

export function pickQuoteForCategory(category, lastQuoteKey = "", random = Math.random) {
  const pool = getQuotesForCategory(category);

  if (!pool.length) {
    return null;
  }

  const withoutRepeat = pool.filter((quote) => quoteKey(quote) !== lastQuoteKey);
  const options = withoutRepeat.length ? withoutRepeat : pool;
  const index = Math.floor(random() * options.length);
  return options[index] || options[0];
}

export function pickContextualQuote(category, lastQuoteKey = "", random = Math.random) {
  const selectedCategory = random() < BATTLE_PROBABILITY ? UNIVERSAL_CATEGORY : category;

  return (
    pickQuoteForCategory(selectedCategory, lastQuoteKey, random) ||
    pickQuoteForCategory(category, lastQuoteKey, random) ||
    pickQuoteForCategory(UNIVERSAL_CATEGORY, lastQuoteKey, random)
  );
}
