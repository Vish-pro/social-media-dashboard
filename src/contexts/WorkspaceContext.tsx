"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Workspace {
  id: string;
  name: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeWorkspace: Workspace | null;
  setActiveWorkspaceId: (id: string) => void;
  isLoading: boolean;
  refetch: () => void;
}

// Demo workspaces — fallback if not authenticated
const DEMO_WORKSPACES: Workspace[] = [
  { id: "demo-1", name: "Brand HQ" },
  { id: "demo-2", name: "Vavvy Clothing" },
  { id: "demo-3", name: "Personal" },
];

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: DEMO_WORKSPACES,
  activeWorkspaceId: DEMO_WORKSPACES[0].id,
  activeWorkspace: DEMO_WORKSPACES[0],
  setActiveWorkspaceId: () => {},
  isLoading: false,
  refetch: () => {},
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>(DEMO_WORKSPACES);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWorkspaces = async () => {
    if (status !== "authenticated") {
      setWorkspaces(DEMO_WORKSPACES);
      setActiveWorkspaceIdState(DEMO_WORKSPACES[0].id);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/workspaces");
      const data = await res.json();
      if (data.workspaces && data.workspaces.length > 0) {
        setWorkspaces(data.workspaces);
        const saved = localStorage.getItem("activeWorkspaceId");
        if (saved && data.workspaces.some((w: Workspace) => w.id === saved)) {
          setActiveWorkspaceIdState(saved);
        } else {
          setActiveWorkspaceIdState(data.workspaces[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to fetch workspaces:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [session, status]);

  const handleSetActive = (id: string) => {
    setActiveWorkspaceIdState(id);
    localStorage.setItem("activeWorkspaceId", id);
  };

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0] ?? null;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspaceId,
        activeWorkspace,
        setActiveWorkspaceId: handleSetActive,
        isLoading,
        refetch: fetchWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);

