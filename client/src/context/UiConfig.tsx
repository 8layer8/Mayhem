import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useLayoutEffect, type ReactNode } from "react";
import { getUiConfig, HERO_ART_PIXELS, type UiConfig } from "../api/config";
import { effectiveTvUiScale } from "../util/tv";

const DEFAULT_CONFIG: UiConfig = {
  appTitle: "Mayhem",
  uiScale: "medium",
  visualizerEnabled: true,
  fullScreenFadePercent: 45,
};

const UiConfigContext = createContext<UiConfig>(DEFAULT_CONFIG);

export function UiConfigProvider({ children }: { children: ReactNode }) {
  const { data = DEFAULT_CONFIG } = useQuery({
    queryKey: ["ui-config"],
    queryFn: getUiConfig,
    staleTime: Infinity,
  });

  const uiScale = effectiveTvUiScale(data.uiScale) as UiConfig["uiScale"];
  const config = uiScale === data.uiScale ? data : { ...data, uiScale };

  useLayoutEffect(() => {
    document.documentElement.dataset.uiScale = uiScale;
  }, [uiScale]);

  return <UiConfigContext.Provider value={config}>{children}</UiConfigContext.Provider>;
}

export function useUiConfig(): UiConfig {
  return useContext(UiConfigContext);
}

export function useHeroArtPixels(): number {
  const { uiScale } = useUiConfig();
  return HERO_ART_PIXELS[uiScale];
}
