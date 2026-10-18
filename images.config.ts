import type { ImagesConfig } from "./bin/images.ts";

/**
 * Configuration for `pnpm images`: every collection lists a source directory and the
 * resized variants that should be generated next to the originals.
 */
const config: ImagesConfig = {
  settings: {
    // Move files to the trash instead of deleting them directly, when using the
    // "recreate" or "remove" argument
    useTrash: false,
  },
  collections: [
    {
      name: "Slider images 1",
      source: "./static/images/slides",
      recursive: false,
      sizes: [
        { name: "Desktop Resolution", width: 1110, height: 547, fit: "cover", position: "center" },
        { name: "Tablet Resolution", width: 690, height: 280 },
        { name: "Smartphone Resolution", width: 510, height: 207 },
      ],
    },
    {
      name: "Album images",
      source: "./static/images/album",
      recursive: false,
      sizes: [
        { name: "Desktop Resolution", width: 255, height: 255 },
        { name: "Tablet Resolution", width: 210, height: 210 },
        { name: "Smartphone Resolution", width: 510, height: 510 },
      ],
    },
  ],
};

export default config;
