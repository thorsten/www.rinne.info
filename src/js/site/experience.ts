/** Expandable experience cards: button for keyboard/screen readers, whole card on touch devices. */
export function initExperienceCards(): void {
  const touch = window.matchMedia("(hover: none)");

  for (const card of document.querySelectorAll<HTMLElement>(".exp")) {
    const button = card.querySelector<HTMLButtonElement>(".exp-arrow");
    if (!button) continue;

    const setOpen = (open: boolean): void => {
      card.classList.toggle("open", open);
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "Details ausblenden" : "Details anzeigen");
    };
    const isOpen = (): boolean => card.classList.contains("open");

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setOpen(!isOpen());
    });
    card.addEventListener("click", () => {
      if (touch.matches) setOpen(!isOpen());
    });
  }
}
