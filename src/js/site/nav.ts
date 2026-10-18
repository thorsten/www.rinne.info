/** Mobile navigation toggle plus active-section highlighting via IntersectionObserver. */
export function initNav(): void {
  const links = document.getElementById("navLinks");
  const toggle = document.getElementById("navToggle");
  const iconOpen = document.getElementById("navIconOpen");
  const iconClose = document.getElementById("navIconClose");

  if (links && toggle && iconOpen && iconClose) {
    const setOpen = (open: boolean): void => {
      links.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
      iconOpen.classList.toggle("hidden", open);
      iconClose.classList.toggle("hidden", !open);
    };
    toggle.addEventListener("click", () => setOpen(!links.classList.contains("open")));
    for (const link of links.querySelectorAll("a")) {
      link.addEventListener("click", () => setOpen(false));
    }
  }

  const navLinks = document.querySelectorAll<HTMLAnchorElement>("#navLinks a[data-section]");
  const sections = Array.from(navLinks)
    .map((link) => document.getElementById(link.dataset.section ?? ""))
    .filter((section): section is HTMLElement => section !== null);
  if (sections.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const link of navLinks) {
          link.classList.toggle("active", link.dataset.section === entry.target.id);
        }
      }
    },
    { rootMargin: "-40% 0px -55% 0px" },
  );
  for (const section of sections) observer.observe(section);
}
