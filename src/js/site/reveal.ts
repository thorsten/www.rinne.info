/** Adds `.in` once an element scrolls into view, which triggers the CSS reveal transition. */
export function initReveal(): void {
  const targets = document.querySelectorAll(".reveal, .reveal-stagger");
  if (targets.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("in");
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0, rootMargin: "0px 0px -60px 0px" },
  );
  for (const target of targets) observer.observe(target);
}
