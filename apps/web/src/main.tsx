import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { Toaster } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";
import { isApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

import { App } from "./App";
import "./styles.css";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // A session that expires mid-flight should send the user back to sign-in
      // once, via the `me` query, instead of every query erroring in place.
      if (isApiError(error, 401) && query.queryKey[0] !== queryKeys.me[0]) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.me });
      }
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: (failureCount, error) =>
        !isApiError(error) || error.status >= 500 ? failureCount < 2 : false,
    },
  },
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <BrowserRouter>
          <App />
          <Toaster position="bottom-right" richColors closeButton />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
);
