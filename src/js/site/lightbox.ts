/** Gallery lightbox on a native <dialog>: click a photo, arrow keys or buttons to navigate, Esc or backdrop to close. */
export function initLightbox(): void {
  const dialog = document.getElementById("lightbox");
  const triggers = Array.from(document.querySelectorAll<HTMLButtonElement>(".ph-open"));
  if (!(dialog instanceof HTMLDialogElement) || triggers.length === 0) return;

  const img = dialog.querySelector("img");
  const source = dialog.querySelector("source");
  const caption = dialog.querySelector("figcaption");
  if (!img || !source || !caption) return;

  let current = 0;

  const show = (index: number): void => {
    current = (index + triggers.length) % triggers.length;
    const t = triggers[current];
    if (!t) return;
    source.srcset = t.dataset.avif ?? "";
    img.src = t.dataset.src ?? "";
    img.alt = t.getAttribute("aria-label")?.replace(/ groß anzeigen$/, "") ?? "";
    caption.textContent = t.dataset.caption ?? "";
  };

  triggers.forEach((t, i) => {
    t.addEventListener("click", () => {
      show(i);
      dialog.showModal();
    });
  });

  dialog.querySelector("[data-close]")?.addEventListener("click", () => dialog.close());
  dialog.querySelector("[data-prev]")?.addEventListener("click", () => show(current - 1));
  dialog.querySelector("[data-next]")?.addEventListener("click", () => show(current + 1));

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") show(current - 1);
    if (event.key === "ArrowRight") show(current + 1);
  });
  dialog.addEventListener("close", () => {
    img.removeAttribute("src");
    source.srcset = "";
  });
}
