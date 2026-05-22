"use client";
import { SWRConfig } from "swr";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false, // Prevent extra fetches
        dedupingInterval: 60000, // 1 minute
      }}
    >
      {children}
    </SWRConfig>
  );
}
