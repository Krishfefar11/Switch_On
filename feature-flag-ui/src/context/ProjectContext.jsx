import { createContext, useState, useEffect, useContext } from 'react';
import { getProjects } from '../api/projectApi';
import { useAuth } from './AuthContext';

const ProjectContext = createContext(null);

export const ProjectProvider = ({ children }) => {
  const { user } = useAuth();
  const [projects,       setProjects]       = useState([]);
  const [currentProject, setCurrentProject] = useState(null);

  // Load projects whenever the logged-in user changes
  useEffect(() => {
    if (!user) { setProjects([]); setCurrentProject(null); return; }

    getProjects()
      .then(r => {
        const list = r.data.projects ?? [];
        setProjects(list);

        // Restore previously selected project from localStorage, or fall back to first
        const savedId = localStorage.getItem('so_project_id');
        const found   = savedId ? list.find(p => String(p._id || p.id) === savedId) : null;
        setCurrentProject(found ?? list[0] ?? null);
      })
      .catch(() => {});
  }, [user]);

  const switchProject = (project) => {
    setCurrentProject(project);
    if (project) localStorage.setItem('so_project_id', String(project._id || project.id));
    else         localStorage.removeItem('so_project_id');
  };

  const refreshProjects = async () => {
    try {
      const r    = await getProjects();
      const list = r.data.projects ?? [];
      setProjects(list);
      // Keep current selection if still valid
      if (currentProject) {
        const curId = String(currentProject._id || currentProject.id);
        const still = list.find(p => String(p._id || p.id) === curId);
        setCurrentProject(still ?? list[0] ?? null);
      } else {
        setCurrentProject(list[0] ?? null);
      }
    } catch {}
  };

  const projectId = currentProject ? String(currentProject._id || currentProject.id) : null;

  return (
    <ProjectContext.Provider value={{ projects, currentProject, projectId, switchProject, refreshProjects }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => useContext(ProjectContext);
