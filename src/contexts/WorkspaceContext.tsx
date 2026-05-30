"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: [],
  activeWorkspaceId: null,
  activeWorkspace: null,
  setActiveWorkspaceId: () => {},
  isLoading: true,
  refetch: () => {},
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkspaces = useCallback(() => {
    setIsLoading(true);
    fetch("/api/workspaces")
      .then((res) => res.json())
      .then((data) => {
        if (data.workspaces?.length > 0) {
          setWorkspaces(data.workspaces);
          const savedId = localStorage.getItem("activeWorkspaceId");
          setActiveWorkspaceIdState((prev) => {
            if (prev && data.workspaces.find((w: Workspace) => w.id === prev)) return prev;
            if (savedId && data.workspaces.find((w: Workspace) => w.id === savedId)) return savedId;
            return data.workspaces[0].id;
          });
        } else {
          setWorkspaces([]);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchWorkspaces();
    } else if (status !== "loading") {
      setIsLoading(false);
    }
  }, [status, fetchWorkspaces]);

  const handleSetActive = (id: string) => {
    setActiveWorkspaceIdState(id);
    localStorage.setItem("activeWorkspaceId", id);
  };

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;

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
