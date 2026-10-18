/** Nav background after scrolling and hero parallax, throttled to one update per frame. */
export function initScroll(): void {
  const nav = document.getElementById("nav");
  const hero = document.getElementById("heroImg");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let ticking = false;

  const update = (): void => {
    nav?.classList.toggle("scrolled", window.scrollY > 40);
    if (hero && !reduceMotion) hero.style.setProperty("--py", `${window.scrollY * 0.3}px`);
    ticking = false;
  };
  const onScroll = (): void => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  update();
}
