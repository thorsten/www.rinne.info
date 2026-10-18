/** Fills `[data-since]` elements with the number of years since the given year. */
export function initSince(now: Date = new Date()): void {
  const year = now.getFullYear();
  for (const element of document.querySelectorAll<HTMLElement>("[data-since]")) {
    const since = Number(element.dataset.since);
    if (Number.isFinite(since)) element.textContent = String(year - since);
  }
  for (const element of document.querySelectorAll<HTMLElement>("[data-year]")) {
    element.textContent = String(year);
  }
}
