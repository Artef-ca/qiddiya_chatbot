/**
 * Pro toggle state persisted across in-app navigation (welcome -> chat panel).
 * Uses module-level variable so it resets on page refresh.
 * Call clearProState() when user clicks "New Chat" to reset.
 */
let storedIsPro = false;

export function getProState(): boolean {
  return storedIsPro;
}

export function setProState(value: boolean): void {
  storedIsPro = value;
}

export function clearProState(): void {
  storedIsPro = false;
}
