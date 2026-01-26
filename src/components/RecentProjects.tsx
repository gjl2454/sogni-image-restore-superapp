import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { SogniClient } from '@sogni-ai/sogni-client';
import { useProjectHistory } from '../hooks/useProjectHistory';
import { useFavorites } from '../hooks/useFavorites';
import JobItem from './projectHistory/JobItem';
import MediaSlideshow from './projectHistory/MediaSlideshow';
import ConfirmModal from './shared/ConfirmModal';
import FavoritesView from './FavoritesView';
import type { ArchiveProject, ArchiveJob } from '../types/projectHistory';
import type { FavoriteImage } from '../services/favoritesService';
import './RecentProjects.css';

interface RecentProjectsProps {
  sogniClient: SogniClient | null;
  onClose: () => void;
}

const RecentProjects: React.FC<RecentProjectsProps> = ({ sogniClient, onClose }) => {
  const {
    visibleProjects,
    loading,
    initialized,
    hasMore,
    error,
    refresh,
    loadMore,
    prefetchNext,
    hideJob,
    deleteProject
  } = useProjectHistory({ sogniClient });
  
  const { favorites } = useFavorites();

  const [selectedProject, setSelectedProject] = useState<ArchiveProject | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ArchiveProject | null>(null);
  const [showDeleteJobConfirm, setShowDeleteJobConfirm] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<{ projectId: string; jobId: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'recents' | 'favorites'>('recents');
  const [selectedFavorite, setSelectedFavorite] = useState<FavoriteImage | null>(null);
  const [openedFromFavorites, setOpenedFromFavorites] = useState(false);
  const [previousTab, setPreviousTab] = useState<'recents' | 'favorites'>('recents'); // Track tab before opening slideshow
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Load initial data
  useEffect(() => {
    if (sogniClient) {
      refresh();
    }
  }, [sogniClient, refresh]);

  // Track previous tab to detect tab switches
  const prevTabRef = useRef<'recents' | 'favorites'>('recents');
  
  // When switching to Recents tab from Favorites, refresh data and scroll to top
  useEffect(() => {
    // Only refresh if we're switching TO recents FROM favorites
    if (activeTab === 'recents' && prevTabRef.current === 'favorites' && sogniClient) {
      // Refresh to get the latest projects (sorted by createdAt descending - newest first)
      refresh();
      // Scroll to top to show the most recent batch first
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
      }, 0);
    }
    // Update previous tab reference
    prevTabRef.current = activeTab;
  }, [activeTab, sogniClient, refresh]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!containerRef.current || !hasMore || loading) return;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
          // Prefetch next page
          setTimeout(() => prefetchNext(), 100);
        }
      },
      { rootMargin: '200px' }
    );

    // Observe the last project element
    const lastProject = containerRef.current.lastElementChild;
    if (lastProject) {
      observerRef.current.observe(lastProject);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadMore, prefetchNext, visibleProjects.length]);

  const handleViewJob = useCallback((project: ArchiveProject, jobId: string) => {
    setPreviousTab(activeTab); // Save current tab before opening slideshow
    setSelectedProject(project);
    setSelectedJobId(jobId);
    setOpenedFromFavorites(false); // Not from favorites when clicking from recents
  }, [activeTab]);

  const handleCloseSlideshow = useCallback(() => {
    setSelectedProject(null);
    setSelectedJobId(null);
    setSelectedFavorite(null);
    // Restore the previous tab (favorites or recents) when closing slideshow
    if (openedFromFavorites) {
      setActiveTab('favorites');
    }
    setOpenedFromFavorites(false);
  }, [openedFromFavorites]);

  const handleDeleteClick = useCallback((project: ArchiveProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(project);
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!projectToDelete) return;
    
    setDeletingProjectId(projectToDelete.id);
    setShowDeleteConfirm(false);
    
    const success = await deleteProject(projectToDelete.id);
    if (success) {
      // Project will be filtered out automatically
      // If we're viewing this project in slideshow, close it
      if (selectedProject?.id === projectToDelete.id) {
        setSelectedProject(null);
        setSelectedJobId(null);
      }
    }
    
    setDeletingProjectId(null);
    setProjectToDelete(null);
  }, [projectToDelete, deleteProject, selectedProject]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
    setProjectToDelete(null);
  }, []);

  const handleDeleteJobClick = useCallback((projectId: string, jobId: string) => {
    setJobToDelete({ projectId, jobId });
    setShowDeleteJobConfirm(true);
  }, []);

  const handleDeleteJobConfirm = useCallback(async () => {
    if (!jobToDelete) return;
    
    setShowDeleteJobConfirm(false);
    const success = await hideJob(jobToDelete.projectId, jobToDelete.jobId);
    
    if (!success) {
      // If deletion failed, show error
      console.error('Failed to delete job');
      return;
    }
    
    if (success) {
      // If we're viewing this job in slideshow, check if we need to close or navigate
      if (selectedProject?.id === jobToDelete.projectId && selectedJobId === jobToDelete.jobId) {
        // Get the updated project from visibleProjects
        const updatedProject = visibleProjects.find(p => p.id === jobToDelete.projectId);
        if (!updatedProject) {
          // Project no longer exists, close slideshow
          setSelectedProject(null);
          setSelectedJobId(null);
          setJobToDelete(null);
          return;
        }
        
        // Find remaining jobs in the project
        const remainingJobs = updatedProject.jobs.filter(
          j => j.id !== jobToDelete.jobId && j.status === 'completed' && !j.hidden && !j.isNSFW
        );
        
        if (remainingJobs.length === 0) {
          // No more jobs, close slideshow
          setSelectedProject(null);
          setSelectedJobId(null);
        } else {
          // Navigate to the first remaining job (or next if available)
          const currentIndex = remainingJobs.findIndex(j => j.id === selectedJobId);
          const nextIndex = currentIndex >= 0 && currentIndex < remainingJobs.length - 1 
            ? currentIndex + 1 
            : Math.max(0, currentIndex - 1);
          setSelectedJobId(remainingJobs[nextIndex].id);
        }
      }
    }
    
    setJobToDelete(null);
  }, [jobToDelete, hideJob, selectedProject, selectedJobId, visibleProjects]);

  const handleDeleteJobCancel = useCallback(() => {
    setShowDeleteJobConfirm(false);
    setJobToDelete(null);
  }, []);

  const formatDate = useCallback((timestamp: number) => {
    // Ensure timestamp is valid
    if (!timestamp || timestamp <= 0 || timestamp > Date.now()) {
      return 'Recently';
    }
    
    const date = new Date(timestamp);
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'processing':
        return '#2196F3';
      case 'failed':
        return '#f44336';
      case 'canceled':
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <div className="recent-projects-overlay">
      <div className="recent-projects-container">
        {/* Header */}
        <div className="recent-projects-header">
          <div className="recent-projects-tabs">
            <button
              className={`recent-projects-tab ${activeTab === 'recents' ? 'active' : ''}`}
              onClick={() => setActiveTab('recents')}
            >
              Recents
            </button>
            <button
              className={`recent-projects-tab ${activeTab === 'favorites' ? 'active' : ''}`}
              onClick={() => setActiveTab('favorites')}
            >
              Favorites
            </button>
          </div>
          <button className="recent-projects-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Content */}
        <div className="recent-projects-content" ref={containerRef}>
          {activeTab === 'recents' ? (
            <>
              {/* Expiry Info Banner */}
              {initialized && visibleProjects.length > 0 && (
                <div
                  style={{
                    margin: '0 16px 16px 16px',
                    padding: '12px 16px',
                    background: 'rgba(123, 163, 208, 0.1)',
                    border: '1px solid rgba(123, 163, 208, 0.3)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--color-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>💡</span>
                  <div>
                    <strong style={{ color: 'var(--color-text-primary)' }}>Images expire after 24 hours.</strong>
                    {' '}Favorite images you want to keep permanently, or download them to your device.
                  </div>
                </div>
              )}
              {/* Show loading state while initializing or loading first page */}
              {(!initialized || (loading && visibleProjects.length === 0)) && (
                <div className="recent-projects-loading">
                  <div className="recent-projects-spinner" />
                  <p>Loading your projects...</p>
                </div>
              )}

              {/* Show error only after initialization */}
              {initialized && error && visibleProjects.length === 0 && (
                <div className="recent-projects-error">
                  <p>⚠️ {error}</p>
                  <button onClick={refresh} className="btn-primary">
                    Try Again
                  </button>
                </div>
              )}

              {/* Show empty state only after initialization and when not loading */}
              {initialized && !loading && !error && visibleProjects.length === 0 && (
                <div className="recent-projects-empty">
                  <p>No recent projects</p>
                  <p className="recent-projects-empty-subtitle">
                    Your restored images from the last 24 hours will appear here
                  </p>
                </div>
              )}

              {visibleProjects.map((project) => {
                const completedJobs = project.jobs.filter(
                  j => j.status === 'completed' && !j.hidden && !j.isNSFW
                );
                const aspect = project.width && project.height ? project.width / project.height : 1;

                if (completedJobs.length === 0) return null;

                return (
                  <div
                    key={project.id}
                    className={`recent-project-card ${deletingProjectId === project.id ? 'deleting' : ''}`}
                  >
                    {/* Project Header */}
                    <div className="recent-project-header">
                      <div className="recent-project-info">
                        <span className="recent-project-date">{formatDate(project.createdAt)}</span>
                      </div>
                      <button
                        className="recent-project-delete"
                        onClick={(e) => handleDeleteClick(project, e)}
                        disabled={deletingProjectId === project.id}
                        aria-label="Delete project"
                      >
                        🗑️
                      </button>
                    </div>

                    {/* Jobs Grid */}
                    {completedJobs.length > 0 && (
                      <div className="recent-project-jobs">
                        {completedJobs.map((job) => (
                          <JobItem
                            key={job.id}
                            job={job}
                            aspect={aspect}
                            sogniClient={sogniClient}
                            onView={() => handleViewJob(project, job.id)}
                            onHideJob={hideJob}
                            modelName={project.model.name}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && visibleProjects.length > 0 && (
                <div className="recent-projects-loading-more">
                  <div className="recent-projects-spinner" />
                  <p>Loading more...</p>
                </div>
              )}
            </>
          ) : (
            <FavoritesView
              sogniClient={sogniClient}
              onViewImage={(favorite) => {
                console.log('[RecentProjects] Favorite clicked:', {
                  favoriteJobId: favorite.jobId,
                  favoriteProjectId: favorite.projectId,
                  visibleProjectIds: visibleProjects.map(p => p.id),
                  visibleProjectJobIds: visibleProjects.flatMap(p => p.jobs.map(j => ({ projectId: p.id, jobId: j.id })))
                });
                
                // Find the project that contains this favorite job
                // First try to match by job ID
                let project = visibleProjects.find(p => 
                  p.jobs.some(j => j.id === favorite.jobId)
                );
                
                // If not found by job ID, try to match by project ID
                if (!project && favorite.projectId) {
                  project = visibleProjects.find(p => p.id === favorite.projectId);
                  console.log('[RecentProjects] Project not found by job ID, trying project ID:', {
                    favoriteProjectId: favorite.projectId,
                    found: !!project
                  });
                }
                
                if (project) {
                  console.log('[RecentProjects] Found project:', {
                    projectId: project.id,
                    jobCount: project.jobs.length,
                    jobIds: project.jobs.map(j => j.id)
                  });
                  setOpenedFromFavorites(true);
                  setSelectedProject(project);
                  setSelectedJobId(favorite.jobId);
                } else {
                  // Project not found in visibleProjects (might be from current session or older than 24h)
                  // Create a placeholder project so the slideshow can still open
                  console.log('[RecentProjects] Project not found in visibleProjects, creating placeholder project for favorite:', favorite);
                  const placeholderProject: ArchiveProject = {
                    id: 'combined-favorites',
                    type: 'image',
                    numberOfMedia: 1,
                    jobs: [{
                      id: favorite.jobId,
                      projectId: favorite.projectId || 'current-session',
                      type: 'image',
                      status: 'completed',
                      createdAt: favorite.createdAt || Date.now(),
                      endTime: favorite.createdAt || Date.now(),
                      hidden: false,
                      isNSFW: false
                    }],
                    status: 'completed',
                    createdAt: favorite.createdAt || Date.now(),
                    width: 1024,
                    height: 1024,
                    model: { id: 'unknown', name: favorite.modelName || 'Restoration' }
                  };
                  setOpenedFromFavorites(true);
                  setSelectedProject(placeholderProject);
                  setSelectedJobId(favorite.jobId);
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Slideshow Modal */}
      {selectedProject && selectedJobId && sogniClient && (() => {
        // Get the current project from visibleProjects to ensure it has the latest data
        // But if it's a placeholder project (combined-favorites or from current session), use it directly
        let currentProject = visibleProjects.find(p => p.id === selectedProject.id);
        if (!currentProject) {
          // If project not found, it might be a placeholder project (e.g., from current session)
          // Use the selectedProject directly if it's a combined-favorites or has the job we need
          if (selectedProject.id === 'combined-favorites' || 
              selectedProject.jobs.some(j => j.id === selectedJobId)) {
            currentProject = selectedProject;
            console.log('[RecentProjects] Using placeholder project for slideshow:', selectedProject.id);
          } else {
            console.warn('[RecentProjects] Project not found in visibleProjects and not a valid placeholder:', selectedProject.id);
            return null;
          }
        }
        
        // If opened from favorites, we need to create a combined project that includes
        // all jobs from all projects that contain favorited jobs
        // IMPORTANT: This is recalculated on every render so it updates when favorites change
        if (openedFromFavorites) {
          try {
            const favoriteJobIds = new Set(favorites.map(f => f.jobId));
            
            // Build a comprehensive map of ALL jobs from ALL visible projects
            // This ensures we find jobs even if they're in projects that don't have other favorites
            const allJobsMap = new Map<string, ArchiveJob>();
            visibleProjects.forEach(p => {
              p.jobs.forEach(job => {
                if (job.status === 'completed' && !job.hidden && !job.isNSFW) {
                  allJobsMap.set(job.id, job);
                }
              });
            });
            
            // Build the jobs array in the same order as the favorites array
            // This matches the visual grid order (top-left to bottom-right, left-to-right per row)
            const allFavoritedJobs: ArchiveJob[] = [];
            const missingFavorites: FavoriteImage[] = [];
            
            favorites.forEach(favorite => {
              const job = allJobsMap.get(favorite.jobId);
              if (job) {
                allFavoritedJobs.push(job);
              } else {
                // Job not found in visibleProjects - might be from current session or older than 24h
                // Create a placeholder job so it can be displayed in the slideshow
                // SlideshowContent will use the favorite's stored URL directly
                const placeholderJob: ArchiveJob = {
                  id: favorite.jobId,
                  projectId: 'current-session', // Always use 'current-session' for placeholder jobs
                  type: 'image',
                  status: 'completed',
                  createdAt: favorite.createdAt || Date.now(),
                  endTime: favorite.createdAt || Date.now(),
                  hidden: false,
                  isNSFW: false
                };
                allFavoritedJobs.push(placeholderJob);
                missingFavorites.push(favorite);
              }
            });
            
            // Find projects that contain favorited jobs (for base project selection)
            const projectsWithFavorites = visibleProjects.filter(p => 
              p.jobs.some(j => favoriteJobIds.has(j.id))
            );
            
            // Only proceed if we have at least some jobs
            if (allFavoritedJobs.length > 0) {
              // Log if any favorites weren't found in the projects (only if significant)
              if (missingFavorites.length > 0 && missingFavorites.length < favorites.length) {
                // Only log if some favorites are missing but not all (to avoid spam)
                console.warn('[RecentProjects] Some favorites not found in visibleProjects:', {
                  missingCount: missingFavorites.length,
                  totalFavorites: favorites.length,
                  missingJobIds: missingFavorites.map(f => f.jobId),
                  note: 'These favorites might be from projects older than 24 hours'
                });
              }
              
              // If we have missing favorites, try to refresh the project history to load them
              // This is a best-effort attempt - the user might need to manually refresh
              if (missingFavorites.length > 0 && allFavoritedJobs.length > 0) {
                // Don't block, but try to refresh in the background
                setTimeout(() => {
                  refresh();
                }, 100);
              }
              
              // Create the combined project with all found favorited jobs
              // Use the first project with favorites as a base, or any project if none have favorites
              const baseProject = projectsWithFavorites.length > 0 
                ? projectsWithFavorites[0]
                : visibleProjects[0] || currentProject;
              
              // Get model name from the first favorite that has one, or use base project's model name
              const firstFavoriteWithModel = favorites.find(f => f.modelName);
              const combinedModelName = firstFavoriteWithModel?.modelName || baseProject?.model?.name || 'Restoration';
              
              // Create a combined project with all required fields
              // IMPORTANT: Keep the original projectId for each job so useMediaUrl can fetch URLs correctly
              // IMPORTANT: Create a new object reference so React detects the change
              currentProject = {
                ...(baseProject || {}),
                id: 'combined-favorites',
                type: 'image' as const,
                jobs: [...allFavoritedJobs], // Create new array reference
                numberOfMedia: allFavoritedJobs.length,
                status: 'completed' as const,
                createdAt: allFavoritedJobs.length > 0 
                  ? Math.min(...allFavoritedJobs.map(j => j.createdAt))
                  : Date.now(),
                width: baseProject?.width || 1024,
                height: baseProject?.height || 1024,
                model: {
                  id: baseProject?.model?.id || 'unknown',
                  name: combinedModelName
                }
              };
              
              // Verify that the selectedJobId (if set) is in the combined project
              const selectedJobIndex = selectedJobId ? allFavoritedJobs.findIndex(j => j.id === selectedJobId) : -1;
              
              if (selectedJobId && selectedJobIndex === -1) {
                // This shouldn't happen, but if it does, log detailed info for debugging
                console.error('[RecentProjects] ⚠️ WARNING: selectedJobId not found in combined project!', {
                  selectedJobId,
                  allJobIds: allFavoritedJobs.map(j => j.id),
                  favoriteJobIds: Array.from(new Set(favorites.map(f => f.jobId))),
                  allJobsMapHasJob: allJobsMap.has(selectedJobId),
                  allJobsMapSize: allJobsMap.size,
                  visibleProjectsCount: visibleProjects.length
                });
              }
            } else {
              // No favorited jobs found in visibleProjects
              console.warn('[RecentProjects] No favorited jobs found in visibleProjects, using original project');
              // Fall back to using the original project - it will be filtered by favoritesOnly in MediaSlideshow
            }
          } catch (error) {
            console.error('[RecentProjects] ❌ Error creating combined favorites project:', error);
            // Fall back to using the original project
            // The MediaSlideshow will filter by favoritesOnly, so it should still work
          }
        }
        
        // Create a key that changes when favorites change
        // CRITICAL: Include favorites.length and the full favorites array in the key
        // This forces MediaSlideshow to re-render with updated project when favorites change
        const favoritesKey = openedFromFavorites 
          ? favorites.map(f => f.jobId).sort().join(',')
          : '';
        
        // Count visible jobs - this changes when the combined project is recalculated
        const visibleJobsCount = currentProject.jobs.filter(
          j => j.status === 'completed' && !j.hidden && !j.isNSFW
        ).length;
        
        // Create a comprehensive key that changes whenever favorites change
        // This ensures MediaSlideshow re-renders with the updated project when favorites change
        // For combined favorites, include favorites.length to detect when new favorites are added
        const slideshowKey = openedFromFavorites && currentProject.id === 'combined-favorites'
          ? `combined-favorites-${favorites.length}-${favoritesKey}-${visibleJobsCount}-${selectedJobId}`
          : `${currentProject.id}-${visibleJobsCount}-${selectedJobId}-${openedFromFavorites}`;
        
        return (
          <MediaSlideshow
            key={slideshowKey}
            project={currentProject}
            initialJobId={selectedJobId}
            sogniClient={sogniClient}
            onClose={handleCloseSlideshow}
            onDeleteJob={handleDeleteJobClick}
            favoritesOnly={openedFromFavorites}
          />
        );
      })()}

      {/* Delete Project Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Project"
        message={`Are you sure you want to delete this project? This will permanently remove all ${projectToDelete?.numberOfMedia || 0} image${projectToDelete?.numberOfMedia !== 1 ? 's' : ''} and cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        type="danger"
      />

      {/* Delete Job Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteJobConfirm}
        title="Delete Image"
        message="Are you sure you want to delete this image? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteJobConfirm}
        onCancel={handleDeleteJobCancel}
        type="danger"
      />
    </div>
  );
};

export default RecentProjects;
