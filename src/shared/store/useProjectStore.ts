import { create } from "zustand";

type Project = {
  id: string;
  name: string;
  createdAt: number;
};

type ProjectState = {
  projects: Project[];
  activeProject: Project | null;

  createProject: (name: string) => void;
  deleteProject: (id: string) => void;
};

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  activeProject: null,

  createProject: (name) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
    };

    set((state) => ({
      projects: [...state.projects, newProject],
      activeProject: newProject,
    }));
  },

  deleteProject: (id) => {
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProject:
        state.activeProject?.id === id ? null : state.activeProject,
    }));
  },
}));