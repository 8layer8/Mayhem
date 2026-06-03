import { api } from "./client";

export type UiScale = "small" | "medium" | "large" | "extra-large" | "full";

export interface UiConfig {
  appTitle: string;
  uiScale: UiScale;
  visualizerEnabled: boolean;
}

export const HERO_ART_PIXELS: Record<UiScale, number> = {
  small: 400,
  medium: 600,
  large: 800,
  "extra-large": 1200,
  full: 1920,
};

export const getUiConfig = () => api.get<UiConfig>("/api/config");
