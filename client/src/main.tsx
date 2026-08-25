import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { UiConfigProvider } from "./context/UiConfig";
import { initTeslaViewport } from "./util/teslaViewport";
import { initTvMode } from "./util/tv";
import "./styles.css";

initTvMode();
initTeslaViewport();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <UiConfigProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </UiConfigProvider>
    </QueryClientProvider>
  </StrictMode>,
);
