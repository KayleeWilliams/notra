// oxlint-disable shadcn/no-inline-styles -- takumi draws inline styles only; this markup never reaches a browser.
import type { ReactElement } from "react";

import { OG_FONT_FAMILY, OG_GRID_SIZE, OG_THEME } from "../constants/og-images";
import type { OgCardContent } from "../types/og-images";
import { titleSize, withAlpha } from "../utils/og-card";

export function OgCard(content: OgCardContent): ReactElement {
  const theme = OG_THEME[content.appearance];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px 68px",
        position: "relative",
        backgroundColor: theme.background,
        backgroundImage: [
          `radial-gradient(ellipse 70% 95% at 100% 0%, ${withAlpha(content.accent, theme.glow)}, transparent 70%)`,
          `radial-gradient(ellipse 50% 70% at 0% 100%, ${withAlpha(content.accent, theme.glow / 3)}, transparent 70%)`,
        ].join(", "),
        color: theme.text,
        fontFamily: OG_FONT_FAMILY,
      }}
    >
      {content.background ? (
        <img
          alt=""
          src={content.background}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(to right, ${theme.grid} 1px, transparent 1px), linear-gradient(to bottom, ${theme.grid} 1px, transparent 1px)`,
          backgroundSize: `${OG_GRID_SIZE}px ${OG_GRID_SIZE}px`,
          maskImage:
            "radial-gradient(ellipse 75% 90% at 100% 0%, black, transparent 75%)",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {content.logo ? (
            <img
              alt=""
              src={content.logo}
              style={{ height: 56, maxWidth: 280, objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: content.accent,
                color: "#ffffff",
                fontSize: 30,
                fontWeight: 700,
              }}
            >
              {content.siteName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div
            style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em" }}
          >
            {content.siteName}
          </div>
        </div>
        {content.section ? (
          <div
            style={{
              display: "flex",
              padding: "10px 24px",
              borderRadius: 999,
              border: `1.5px solid ${withAlpha(content.accent, 0.35)}`,
              backgroundColor: withAlpha(content.accent, theme.pill),
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            {content.section}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "block",
            fontSize: titleSize(content.title),
            fontWeight: 700,
            lineHeight: 1.06,
            letterSpacing: "-0.035em",
            lineClamp: 3,
            maxWidth: 1000,
          }}
        >
          {content.title}
        </div>
        {content.description ? (
          <div
            style={{
              display: "block",
              marginTop: 24,
              fontSize: 30,
              fontWeight: 500,
              lineHeight: 1.35,
              color: theme.muted,
              lineClamp: 2,
              maxWidth: 940,
            }}
          >
            {content.description}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginTop: 40,
            fontSize: 24,
            fontWeight: 500,
            color: theme.muted,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: content.accent,
            }}
          />
          {content.meta}
        </div>
      </div>
    </div>
  );
}
