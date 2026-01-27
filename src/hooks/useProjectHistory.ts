import { useState, useCallback, useRef } from 'react';
import type { SogniClient } from '@sogni-ai/sogni-client';
import type {
  JobStatus,
  ProjectStatus,
  JobHistoryData,
  JobHistoryItemRaw,
  ArchiveProject,
  ArchiveJob,
  ProjectHistoryState
} from '../types/projectHistory';

// 24 hours TTL for projects
const PROJECT_TTL = 24 * 60 * 60 * 1000;

// Only show projects that use the restoration model (filter out other Sogni app projects)
const RESTORATION_MODEL_ID = 'qwen_image_edit_2511_fp8_lightning';

// Get Sogni API URL based on environment
function getSogniRestUrl() {
  const hostname = window.location.hostname;
  const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';
  const isStaging = hostname.includes('staging');
  
  if (isLocalDev) {
    return 'https://api-local.sogni.ai';
  } else if (isStaging) {
    return 'https://api-staging.sogni.ai';
  }
  
  return 'https://api.sogni.ai';
}

// Fetch more jobs to get restoration images that may be interspersed with other app jobs
const PAGE_SIZE = 1000;

// Map API job status to our JobStatus type
const JOB_STATUS_MAP: Record<string, JobStatus> = {
  created: 'pending',
  queued: 'pending',
  assigned: 'initiating',
  initiatingModel: 'initiating',
  jobStarted: 'processing',
  jobProgress: 'processing',
  jobCompleted: 'completed',
  jobError: 'failed'
};

function mapJobStatus(item: JobHistoryItemRaw): JobStatus {
  if (item.reason === 'artistCanceled') return 'canceled';
  return JOB_STATUS_MAP[item.status] || 'pending';
}

function mapProjectToArchive(item: JobHistoryItemRaw): ArchiveProject {
  let projectStatus: ProjectStatus;
  const jobStatus = mapJobStatus(item);
  switch (jobStatus) {
    case 'failed':
      projectStatus = 'failed';
      break;
    case 'completed':
      projectStatus = 'completed';
      break;
    case 'canceled':
      projectStatus = 'canceled';
      break;
    default:
      projectStatus = 'processing';
  }
  // Use the job's createTime as the project creation time
  // Convert to milliseconds if it's in seconds
  let createdAt = item.createTime && item.createTime > 0 ? item.createTime : Date.now();
  if (createdAt > 0 && createdAt < 946684800000) {
    // Likely in seconds, convert to milliseconds
    createdAt = createdAt * 1000;
  }
  return {
    id: item.parentRequest.id,
    type: item.parentRequest.jobType === 'video' ? 'video' : 'image',
    status: projectStatus,
    numberOfMedia: item.parentRequest.imageCount,
    jobs: [],
    createdAt: createdAt,
    width: item.parentRequest.width,
    height: item.parentRequest.height,
    model: {
      id: item.parentRequest.model.id,
      name: item.parentRequest.model.name
    }
  };
}

function mapJobToArchive(item: JobHistoryItemRaw): ArchiveJob {
  // Convert createTime to milliseconds if it's in seconds (check if it's less than a reasonable timestamp)
  // Timestamps after 2000-01-01 in milliseconds are > 946684800000
  // If createTime is less than this, it's likely in seconds
  let createdAt = item.createTime;
  if (createdAt > 0 && createdAt < 946684800000) {
    // Likely in seconds, convert to milliseconds
    createdAt = createdAt * 1000;
  }
  
  return {
    id: item.imgID,
    isNSFW: item.reason === 'sensitiveContent',
    projectId: item.parentRequest.id,
    type: item.parentRequest.jobType === 'video' ? 'video' : 'image',
    status: mapJobStatus(item),
    createdAt: createdAt,
    endTime: item.endTime
  };
}

interface UseProjectHistoryOptions {
  sogniClient: SogniClient | null;
}

export function useProjectHistory({ sogniClient }: UseProjectHistoryOptions) {
  const [state, setState] = useState<ProjectHistoryState>({
    projects: [],
    loading: false,
    hasMore: true,
    offset: 0,
    initialized: false,
    error: null
  });

  // Track if we're currently fetching to prevent duplicate requests
  const fetchingRef = useRef(false);
  // Track if we're prefetching the next page silently
  const prefetchingRef = useRef(false);
  // Track latest state to avoid stale closure issues (especially with React StrictMode)
  const stateRef = useRef(state);

  stateRef.current = state; // Always keep in sync

  // Get hidden jobs from localStorage
  const getHiddenJobs = useCallback(() => {
    try {
      return new Set<string>(JSON.parse(localStorage.getItem('hiddenJobs') || '[]'));
    } catch {
      return new Set<string>();
    }
  }, []);

  // Fetch a page of job history
  const fetchPage = useCallback(async (offset: number = 0, isPrefetch: boolean = false) => {
    if (!sogniClient) {
      setState(prev => ({ ...prev, error: 'Not authenticated', loading: false }));
      return;
    }

    const walletAddress = sogniClient.account?.currentAccount?.walletAddress;
    if (!walletAddress) {
      setState(prev => ({ ...prev, error: 'No wallet address', loading: false }));
      return;
    }

    // Prevent duplicate fetches
    if (isPrefetch) {
      if (prefetchingRef.current) return;
      prefetchingRef.current = true;
    } else {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
    }

    // Only show loading indicator for non-prefetch requests
    if (!isPrefetch) {
      setState(prev => ({ ...prev, loading: true, error: null }));
    }

    try {
      const params = {
        role: 'artist',
        address: walletAddress,
        limit: PAGE_SIZE,
        offset
      };

      const response = await sogniClient.apiClient.rest.get<{ data: JobHistoryData }>(
        '/v1/jobs/list',
        params
      );

      const { jobs, next } = response.data;

      setState(prev => {
        const minTimestamp = Date.now() - PROJECT_TTL;

        // Filter out jobs older than 24 hours based on endTime
        // Also filter to only show jobs from this restoration app (using the specific model)
        const recentJobs = jobs.filter((job) => {
          // Must be recent
          if (job.endTime <= minTimestamp) return false;
          // Must use the restoration model (filter out other Sogni app projects)
          if (job.parentRequest?.model?.id !== RESTORATION_MODEL_ID) return false;
          return true;
        });

        // Stop pagination if we've hit jobs older than 24 hours
        // Note: We check specifically for old jobs, not jobs filtered by model
        // (we should continue paginating even if current batch is from other apps)
        const hasOldJobs = jobs.length > 0 && jobs.some((job) => job.endTime <= minTimestamp);

        // Get hidden jobs from localStorage first
        const hiddenJobsSet = getHiddenJobs();

        // Build project index - start fresh if offset is 0 (refresh), otherwise merge with existing
        // IMPORTANT: Create a deep copy to preserve createdAt values
        // Also filter out hidden jobs from existing projects
        const projectIndex = offset === 0 ? {} : prev.projects.reduce(
          (acc: Record<string, ArchiveProject>, item) => {
            // Filter out hidden jobs from existing projects
            const visibleJobs = item.jobs.filter(job => !hiddenJobsSet.has(job.id));

            // If all jobs are hidden, don't include this project
            if (visibleJobs.length === 0 && item.jobs.length > 0) {
              return acc;
            }

            acc[item.id] = {
              ...item,
              jobs: visibleJobs, // Only include visible jobs
              hidden: visibleJobs.length === 0, // Mark as hidden if no visible jobs
              // Preserve createdAt - this is critical!
              createdAt: item.createdAt
            };
            return acc;
          },
          {}
        );

        // Process new jobs (hiddenJobsSet is already defined above)
        for (const job of recentJobs) {
          // Skip jobs that triggered NSFW filter (failure state)
          if (job.triggeredNSFWFilter) {
            continue;
          }

          // Skip jobs that are marked as hidden in localStorage
          // Use imgID since that's what we store in localStorage (job.id = item.imgID)
          if (hiddenJobsSet.has(job.imgID)) {
            // If this job belongs to an existing project, make sure to remove it
            const existingProject = projectIndex[job.parentRequest.id];
            if (existingProject) {
              existingProject.jobs = existingProject.jobs.filter(j => j.id !== job.imgID);
              // If all jobs are now removed, mark project as hidden
              if (existingProject.jobs.length === 0) {
                existingProject.hidden = true;
              }
            }
            continue;
          }

          if (!projectIndex[job.parentRequest.id]) {
            // Before creating a new project, check if all its jobs would be hidden
            // We need to check all jobs in recentJobs for this project
            const projectJobs = recentJobs.filter(j => 
              j.parentRequest.id === job.parentRequest.id && 
              !j.triggeredNSFWFilter
            );
            const visibleProjectJobs = projectJobs.filter(j => !hiddenJobsSet.has(j.imgID));
            
            // Don't create project if all jobs are hidden
            if (visibleProjectJobs.length === 0) {
              continue;
            }
            // New project - set createdAt from the first job's createTime
            const newProject = mapProjectToArchive(job);
            // Use the job's createTime (convert to milliseconds if needed) as the project creation time
            let projectCreatedAt = job.createTime && job.createTime > 0 ? job.createTime : Date.now();
            if (projectCreatedAt > 0 && projectCreatedAt < 946684800000) {
              // Likely in seconds, convert to milliseconds
              projectCreatedAt = projectCreatedAt * 1000;
            }
            newProject.createdAt = projectCreatedAt;
            projectIndex[job.parentRequest.id] = newProject;
          }

          const project = projectIndex[job.parentRequest.id];
          const archivedJob = mapJobToArchive(job);

          // Mark as hidden if it's in localStorage (archivedJob.id = job.imgID)
          if (hiddenJobsSet.has(archivedJob.id)) {
            archivedJob.hidden = true;
          }

          // NEVER update createdAt for existing projects - it's already set and should be preserved
          // Only set it if it's still 0 (which shouldn't happen, but just in case)
          if (project.createdAt === 0 || !project.createdAt) {
            project.createdAt = archivedJob.createdAt && archivedJob.createdAt > 0 
              ? archivedJob.createdAt 
              : Date.now();
          }

          // Don't add hidden jobs to the project at all
          if (archivedJob.hidden) {
            // Remove it if it already exists
            project.jobs = project.jobs.filter(j => j.id !== archivedJob.id);
          } else if (project.jobs.some((j) => j.id === archivedJob.id)) {
            project.jobs = project.jobs.map((j) =>
              j.id === job.imgID ? { ...j, ...archivedJob } : j
            );
          } else {
            project.jobs.push(archivedJob);
          }
        }

        // Process updated projects
        const updatedProjects = Object.values(projectIndex);
        updatedProjects.forEach((p) => {
          // Remove hidden jobs completely from the project
          const beforeCount = p.jobs.length;
          p.jobs = p.jobs.filter(job => !hiddenJobsSet.has(job.id));
          
          // If all jobs were removed, mark the project as hidden
          if (beforeCount > 0 && p.jobs.length === 0) {
            p.hidden = true;
          }

          // NEVER recalculate createdAt - it's already set when the project was first created
          // Only set it if it's somehow still 0 or invalid (shouldn't happen)
          if (p.createdAt === 0 || !p.createdAt || p.createdAt > Date.now()) {
            // Find the earliest job creation time as fallback
            let earliestTime = Date.now();
            p.jobs.forEach((job) => {
              if (job.createdAt && job.createdAt > 0 && job.createdAt < earliestTime) {
                earliestTime = job.createdAt;
              }
            });
            // Only update if we found a valid timestamp that's in the past
            if (earliestTime < Date.now()) {
              p.createdAt = earliestTime;
            } else {
              // If we can't find a valid timestamp, use a default (shouldn't happen)
              p.createdAt = Date.now() - (24 * 60 * 60 * 1000); // Default to 24 hours ago
            }
          }
          // createdAt is already set for existing projects, preserve it - DO NOT RECALCULATE
          
          let hasCompletedJobs = false;
          let hasCancelledJobs = false;
          let hasFailedJobs = false;
          let hasActiveJobs = false;

          p.jobs.forEach((job) => {
            // Skip hidden jobs when determining project status
            if (job.hidden) return;
            switch (job.status) {
              case 'completed':
                hasCompletedJobs = true;
                break;
              case 'canceled':
                hasCancelledJobs = true;
                break;
              case 'failed':
                hasFailedJobs = true;
                break;
              default:
                hasActiveJobs = true;
            }
          });
          if (hasActiveJobs) {
            p.status = 'processing';
          } else if (hasCompletedJobs) {
            p.status = 'completed';
          } else if (hasCancelledJobs) {
            p.status = 'canceled';
          } else if (hasFailedJobs) {
            p.status = 'failed';
          }
        });

        // Sort by creation time (newest first)
        updatedProjects.sort((a, b) => b.createdAt - a.createdAt);

        // Filter to only include recent projects and projects that aren't hidden
        const filteredProjects = updatedProjects.filter((p) => {
          const isRecent = p.createdAt > minTimestamp;
          const isNotHidden = !p.hidden;
          const hasVisibleJobs = p.jobs.length > 0;
          return isRecent && isNotHidden && hasVisibleJobs;
        });

        const newHasMore = jobs.length > 0 && next > 0 && next > prev.offset && !hasOldJobs;

        return {
          projects: filteredProjects,
          loading: false,
          initialized: true,
          offset: next,
          // No more data if: empty response, next is 0, offset didn't advance, or hit old jobs
          hasMore: newHasMore,
          error: null
        };
      });
    } catch (error) {
      console.error('Failed to fetch project history:', error);
      if (!isPrefetch) {
        setState(prev => ({
          ...prev,
          loading: false,
          initialized: true,
          error: error instanceof Error ? error.message : 'Failed to fetch history'
        }));
      }
    } finally {
      if (isPrefetch) {
        prefetchingRef.current = false;
      } else {
        fetchingRef.current = false;
      }
    }
  }, [sogniClient]);

  // Initial fetch - keep existing projects to avoid flicker, replace when new data arrives
  const refresh = useCallback(() => {
    setState(prev => ({
      ...prev,
      loading: true,
      hasMore: true,
      offset: 0,
      error: null
    }));
    fetchPage(0);
  }, [fetchPage]);

  // Load more (next page)
  const loadMore = useCallback(() => {
    const currentState = stateRef.current;
    // Don't load more until initial fetch is complete (offset > 0 means we've fetched at least once)
    if (currentState.offset === 0) {
      return;
    }
    if (!currentState.loading && currentState.hasMore) {
      fetchPage(currentState.offset);
    }
  }, [fetchPage]);

  // Prefetch next page silently (no loading indicator)
  const prefetchNext = useCallback(() => {
    const currentState = stateRef.current;
    if (!currentState.loading && currentState.hasMore && !prefetchingRef.current) {
      fetchPage(currentState.offset, true);
    }
  }, [fetchPage]);

  // Hide a job from the list (delete it)
  const hideJob = useCallback(async (projectId: string, jobId: string): Promise<boolean> => {
    if (!sogniClient) {
      console.error('Cannot delete job: not authenticated');
      return false;
    }

    try {
      // Make a DELETE request to the Sogni API to delete the job
      const apiUrl = getSogniRestUrl();
      const response = await fetch(`${apiUrl}/v1/projects/${projectId}/jobs/${jobId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        // If API doesn't support job deletion, fall back to local hiding
        console.warn(`API doesn't support job deletion (${response.status}), using local hide`);
        setState(prev => {
          const projects = prev.projects.map(p => {
            if (p.id === projectId) {
              const updatedJobs = p.jobs.map(j =>
                j.id === jobId ? { ...j, hidden: true } : j
              );
              const allHidden = updatedJobs.every(j => j.hidden);
              return {
                ...p,
                jobs: updatedJobs,
                hidden: allHidden
              };
            }
            return p;
          });
          return { ...prev, projects };
        });
        // Store in localStorage for persistence
        const hiddenJobs = JSON.parse(localStorage.getItem('hiddenJobs') || '[]');
        if (!hiddenJobs.includes(jobId)) {
          hiddenJobs.push(jobId);
          localStorage.setItem('hiddenJobs', JSON.stringify(hiddenJobs));
        }
        return true;
      }

      // Successfully deleted on server, update local state
      setState(prev => {
        const projects = prev.projects.map(p => {
          if (p.id === projectId) {
            const updatedJobs = p.jobs.map(j =>
              j.id === jobId ? { ...j, hidden: true } : j
            );
            const allHidden = updatedJobs.every(j => j.hidden);
            return {
              ...p,
              jobs: updatedJobs,
              hidden: allHidden
            };
          }
          return p;
        });
        return { ...prev, projects };
      });

      // Store in localStorage for persistence across refreshes
      const hiddenJobs = JSON.parse(localStorage.getItem('hiddenJobs') || '[]');
      if (!hiddenJobs.includes(jobId)) {
        hiddenJobs.push(jobId);
        localStorage.setItem('hiddenJobs', JSON.stringify(hiddenJobs));
      }

      return true;
    } catch (error) {
      console.error('Failed to delete job:', error);
      // Fall back to local hiding
      setState(prev => {
        const projects = prev.projects.map(p => {
          if (p.id === projectId) {
            const updatedJobs = p.jobs.map(j =>
              j.id === jobId ? { ...j, hidden: true } : j
            );
            const allHidden = updatedJobs.every(j => j.hidden);
            return {
              ...p,
              jobs: updatedJobs,
              hidden: allHidden
            };
          }
          return p;
        });
        return { ...prev, projects };
      });
      // Store in localStorage for persistence
      const hiddenJobs = JSON.parse(localStorage.getItem('hiddenJobs') || '[]');
      if (!hiddenJobs.includes(jobId)) {
        hiddenJobs.push(jobId);
        localStorage.setItem('hiddenJobs', JSON.stringify(hiddenJobs));
      }
      return true;
    }
  }, [sogniClient]);

  // Delete a project
  const deleteProject = useCallback(async (projectId: string) => {
    if (!sogniClient) {
      console.error('Cannot delete project: not authenticated');
      return false;
    }

    try {
      // Make a direct DELETE request to the Sogni API
      // Use credentials: 'include' to send cookies with the request
      const apiUrl = getSogniRestUrl();
      const response = await fetch(`${apiUrl}/v1/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete project: ${response.status} ${response.statusText}`);
      }
      
      // Mark project as scheduled for deletion
      setState(prev => {
        const projects = prev.projects.map(p =>
          p.id === projectId ? { ...p, scheduledDelete: true } : p
        );
        return { ...prev, projects };
      });
      
      return true;
    } catch (error) {
      console.error('Failed to delete project:', error);
      return false;
    }
  }, [sogniClient]);

  // Get visible projects (filter out hidden and scheduled for deletion)
  const visibleProjects = state.projects.filter(p => {
    if (p.hidden || p.scheduledDelete) return false;
    // Check if at least one job is visible (not hidden, not failed, and not canceled, and not NSFW)
    const visibleJobs = p.jobs.filter(j => 
      !j.hidden && 
      j.status !== 'failed' && 
      j.status !== 'canceled' && 
      !j.isNSFW &&
      j.status === 'completed'
    );
    return visibleJobs.length > 0;
  });

  return {
    ...state,
    visibleProjects,
    initialized: state.initialized,
    refresh,
    loadMore,
    prefetchNext,
    hideJob,
    deleteProject
  };
}

export default useProjectHistory;
