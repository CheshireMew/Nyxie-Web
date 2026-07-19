export function arrangeCreatorCards<T>(cards: readonly T[]): readonly (readonly T[])[] {
  if (cards.length === 0) return [];

  const columns = Math.ceil(cards.length / 2);
  return [cards.slice(0, columns), cards.slice(columns)].filter((row) => row.length > 0);
}
