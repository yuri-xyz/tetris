export function assert(condition: boolean, reasoning: string): asserts condition {
  if (!condition)
    throw new Error(`assertion failed: ${reasoning}`)
}

export function randomInt(minInclusive: number, maxExclusive: number): number {
  assert(minInclusive < maxExclusive, "min should be less than max")

  return Math.floor(Math.random() * (maxExclusive - minInclusive)) + minInclusive
}

export function chooseRandom<T>(choices: T[]): T {
  assert(choices.length > 0, "choices array should not be empty, otherwise there's nothing to choose from")

  return choices[randomInt(0, choices.length)]
}
