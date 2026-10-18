/**
 * This script is used to convert images to different sizes, used for displaying them
 * on a responsive website using the "srcset" attribute of the "<img>" element or
 * the new "<picture>" element.
 *
 * Don't modify or delete this file, if you want to use the "pnpm images" command.
 */

import fs from "node:fs";
import path from "node:path";
import glob from "fast-glob";
import mime from "mime-types";
import sharp, { type FitEnum } from "sharp";
import trash from "trash";
import imageConfig from "../images.config.ts";

export interface SizeConfig {
  /** Identifier shown in the log output. */
  name: string;
  width?: number;
  height?: number;
  fit?: keyof FitEnum;
  position?: string;
}

export interface CollectionConfig {
  name: string;
  /** Directory the script scans for image files. */
  source: string;
  /** Include files in subdirectories. */
  recursive?: boolean;
  sizes: SizeConfig[];
}

export interface ImagesConfig {
  settings: {
    /** Move files to the trash instead of deleting them when using "recreate" or "remove". */
    useTrash: boolean;
  };
  collections: CollectionConfig[];
}

interface FilteredFiles {
  original: string[];
  resized: string[];
  ignored: string[];
}

interface Stats {
  removed: number;
  created: number;
  skipped: number;
}

const RESIZED_FILENAME_PATTERN = /-([0-9]+x[0-9]+|w[0-9]+|h[0-9]+)\.[a-z]+$/i;
const MIME_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/svg+xml"]);

export class ResponsiveImages {
  private readonly config: ImagesConfig;
  private readonly recreate: boolean;
  private readonly remove: boolean;
  private startedAt = new Date();
  private readonly stats: Stats = { removed: 0, created: 0, skipped: 0 };

  constructor(config: ImagesConfig, args: readonly string[] = process.argv) {
    this.config = config;
    this.recreate = args.includes("recreate");
    this.remove = args.includes("remove");
  }

  /** Fixes collection paths and calls runCollection() for each collection. */
  async run(): Promise<void> {
    this.startedAt = new Date();

    for (const collection of this.config.collections) {
      await this.runCollection({ ...collection, source: trailingSlash(collection.source) });
    }

    this.showTitle("Finished Resizing");
    this.showStats();
  }

  /** Runs all processes for a collection. */
  private async runCollection(collection: CollectionConfig): Promise<void> {
    this.showTitle(`Collection "${collection.name}"`);

    // 1. Check if the configuration is in a working state
    try {
      this.validateCollectionConfig(collection);
    } catch (error) {
      this.showError(error);
      return;
    }

    // 2. Read all files in the collection's source path
    let files: FilteredFiles;
    try {
      files = this.filterFiles(await this.getFiles(collection));
    } catch (error) {
      this.showError(error);
      return;
    }

    const fileCount = files.original.length;
    if (fileCount === 0) {
      this.log("No images found.\n");
      return;
    }
    this.log(`${fileCount} original image ${fileCount < 2 ? "file" : "files"} found.\n`);

    // 3. Remove existing resized images, if the argument "remove" or "recreate" is used
    if (this.remove || this.recreate) {
      this.log("Removing resized image formats.");
      await this.removeFiles(files.resized);
      this.log("");
      if (this.remove) return;
    }

    // 4. Resize the images using sharp()
    await this.resizeImages(files.original, collection.sizes);
  }

  /** Validates a collection configuration and throws an error if parts are missing or invalid. */
  private validateCollectionConfig(collection: CollectionConfig): void {
    const sourcePath = path.resolve(collection.source);
    if (!isDirectory(sourcePath)) {
      throw new Error(`The directory ${sourcePath} does not exist or is not readable!`);
    }
    if (collection.sizes.length === 0) {
      throw new Error("No sizes configured!");
    }
    collection.sizes.forEach((size, index) => {
      if (!size.name) throw new Error(`Missing name property for sizes[${index}]!`);
      if (!size.width && !size.height) throw new Error(`No width or height set for size "${size.name}"!`);
    });
  }

  /** Reads all files of a collection, based on the "source" that is set to be used. */
  private async getFiles(collection: CollectionConfig): Promise<string[]> {
    const globPath = `${collection.source}${collection.recursive ? "**/*.*" : "*.*"}`;
    try {
      return await glob(globPath, { dot: false, absolute: true, onlyFiles: true });
    } catch (error) {
      if (isErrno(error) && error.errno === -13) {
        throw new Error(`Permission denied for directory "${collection.source}"`, { cause: error });
      }
      throw error;
    }
  }

  /** Splits the file list into original files, resized ones and those which are ignored. */
  private filterFiles(files: string[]): FilteredFiles {
    const filtered: FilteredFiles = { original: [], resized: [], ignored: [] };
    for (const file of files) {
      const mimeType = mime.lookup(file);
      if (!mimeType || !MIME_TYPES.has(mimeType)) {
        filtered.ignored.push(file);
      } else if (RESIZED_FILENAME_PATTERN.test(file)) {
        filtered.resized.push(file);
      } else {
        filtered.original.push(file);
      }
    }
    return filtered;
  }

  /** Removes all resized files (detected by filename). */
  private async removeFiles(files: string[]): Promise<void> {
    for (const file of files) {
      this.log(`  => ${file}`);
      if (this.config.settings.useTrash) {
        await trash(file);
      } else {
        fs.unlinkSync(file);
      }
      this.stats.removed++;
    }
  }

  /** Runs the resizing process for all images of a collection. */
  private async resizeImages(files: string[], sizes: SizeConfig[]): Promise<void> {
    for (const [index, file] of files.entries()) {
      this.log(`Resizing image ${index + 1} of ${files.length} (${file})`);
      for (const size of sizes) {
        await this.resizeImage(file, size);
      }
      this.log("");
    }
  }

  /** Resizes a single image. Options that are needed, but not set, will use defaults. */
  private async resizeImage(file: string, size: SizeConfig): Promise<void> {
    const filename = addFilenamePostfix(file, size);
    const targetFile = path.join(path.dirname(file), filename);

    this.log(`  => ${filename}`);
    if (fs.existsSync(targetFile)) {
      this.stats.skipped++;
      return;
    }

    await sharp(file)
      .resize({
        ...(size.width !== undefined ? { width: size.width } : {}),
        ...(size.height !== undefined ? { height: size.height } : {}),
        fit: size.fit ?? "cover",
        position: size.position ?? "center",
      })
      .toFile(targetFile);
    this.stats.created++;
  }

  private showTitle(title: string): void {
    const line = "#".repeat(title.length + 4);
    this.log(`${line}\n# ${title} #\n${line}\n`);
  }

  private showError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.log(`### ERROR: ${message}\n`);
  }

  private showStats(): void {
    const seconds = (Date.now() - this.startedAt.getTime()) / 1000;
    this.log(`Script Runtime:\n${seconds.toFixed(2)}s\n`);
    this.log("File Stats:");

    const width = Math.max(...Object.values(this.stats).map((n) => String(n).length)) + 1;
    const row = (count: number, label: string): void => this.log(`${String(count).padStart(width)}  ${label}`);

    if (this.remove || this.recreate) row(this.stats.removed, "image files removed");
    if (this.stats.created > 0) row(this.stats.created, "image files created");
    if (this.stats.skipped > 0 && !this.remove && !this.recreate) row(this.stats.skipped, "image files skipped");
  }

  private log(...args: unknown[]): void {
    console.log(...args);
  }
}

/**
 * Adds a postfix to a filename, based on the size config.
 *
 * Example:
 *  - lonely-cat-1110x457.jpg    Resized version with a fixed width and height
 *  - lonely-cat-w800.jpg        Resized version with a fixed width
 *  - lonely-cat-h400.jpg        Resized version with a fixed height
 */
export function addFilenamePostfix(file: string, size: SizeConfig): string {
  const extension = path.extname(file);
  const base = path.basename(file, extension);
  if (size.width && size.height) return `${base}-${size.width}x${size.height}${extension}`;
  if (size.width) return `${base}-w${size.width}${extension}`;
  if (size.height) return `${base}-h${size.height}${extension}`;
  return path.basename(file);
}

function trailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function isDirectory(target: string): boolean {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
}

function isErrno(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "errno" in error;
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  await new ResponsiveImages(imageConfig).run();
}
