import { OG_TITLE_SIZES } from "../constants/og-images";

export function titleSize(title: string): number {
  const step =
    OG_TITLE_SIZES.find((candidate) => title.length <= candidate.maxLength) ??
    OG_TITLE_SIZES[2];
  return step.size;
}

export function withAlpha(hex: string, alpha: number): string {
  const digits = hex.replace("#", "");
  const full =
    digits.length === 3
      ? [...digits].map((digit) => `${digit}${digit}`).join("")
      : digits;
  const red = Number.parseInt(full.slice(0, 2), 16);
  const green = Number.parseInt(full.slice(2, 4), 16);
  const blue = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
