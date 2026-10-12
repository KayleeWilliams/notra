export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export const OG_IMAGES_DIR = "_notra/og";

export const OG_FONT_FAMILY = "Inter";

export const OG_FONT_SUBSETS = [
  "latin",
  "latin-ext",
  "cyrillic",
  "greek",
] as const;
export const OG_FONT_WEIGHTS = [500, 600, 700] as const;

export const OG_IMAGE_MIME_TYPES: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export const OG_THEME = {
  light: {
    background: "#ffffff",
    text: "#09090b",
    muted: "#52525b",
    grid: "rgba(9, 9, 11, 0.07)",
    glow: 0.45,
    pill: 0.1,
  },
  dark: {
    background: "#09090b",
    text: "#fafafa",
    muted: "#a1a1aa",
    grid: "rgba(255, 255, 255, 0.07)",
    glow: 0.55,
    pill: 0.16,
  },
} as const;

export const OG_GRID_SIZE = 56;

export const OG_TITLE_SIZES = [
  { maxLength: 32, size: 80 },
  { maxLength: 60, size: 66 },
  { maxLength: Number.POSITIVE_INFINITY, size: 54 },
] as const;
