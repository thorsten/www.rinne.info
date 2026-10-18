import "@fontsource-variable/geist/wght.css";
import "@fontsource-variable/geist/wght-italic.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "../css/main.css";

import { initExperienceCards } from "./site/experience";
import { initLightbox } from "./site/lightbox";
import { initNav } from "./site/nav";
import { initReveal } from "./site/reveal";
import { initScroll } from "./site/scroll";
import { initSince } from "./site/since";
import { initTheme } from "./site/theme";

initTheme();
initNav();
initScroll();
initReveal();
initExperienceCards();
initLightbox();
initSince();
