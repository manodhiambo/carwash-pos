import { create } from 'zustand';
import { Job, CheckInPayload, JobStatus } from '@/types';
import { jobsApi } from '@/lib/api';

interface JobState {
  // Active jobs in queue and being processed
  queue: Job[];
  activeJobs: Job[];

  // Selected job for POS/editing
  selectedJob: Job | null;

  // Loading states
  isLoading: boolean;
  isCheckingIn: boolean;

  // Error state
  error: string | null;
}

interface JobActions {
  // Fetch actions
  fetchQueue: () => Promise<void>;
  fetchActiveJobs: () => Promise<void>;
  fetchJobById: (id: string) => Promise<Job | null>;

  // Job operations
  checkIn: (data: CheckInPayload) => Promise<Job>;
  updateStatus: (id: string, status: JobStatus) => Promise<void>;
  assignBay: (id: string, bayId: string) => Promise<void>;
  assignStaff: (id: string, staffId: string) => Promise<void>;
  addService: (id: string, serviceId: string, quantity?: number) => Promise<void>;
  removeService: (id: string, jobServiceId: string) => Promise<void>;
  applyDiscount: (id: string, type: 'percentage' | 'fixed', value: number) => Promise<void>;
  cancelJob: (id: string, reason?: string) => Promise<void>;

  // Selection
  selectJob: (job: Job | null) => void;
  refreshSelectedJob: () => Promise<void>;

  // Error handling
  clearError: () => void;
}

type JobStore = JobState & JobActions;

export const useJobStore = create<JobStore>((set, get) => ({
  // Initial state
  queue: [],
  activeJobs: [],
  selectedJob: null,
  isLoading: false,
  isCheckingIn: false,
  error: null,

  // Fetch queue
  fetchQueue: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await jobsApi.getQueue();
      set({ queue: response.data, isLoading: false });
    } catch (error: unknown) {
      const err = error as { error?: string };
      set({ error: err.error || 'Failed to fetch queue', isLoading: false });
    }
  },

  // Fetch active jobs
  fetchActiveJobs: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await jobsApi.getActive();
      set({ activeJobs: response.data, isLoading: false });
    } catch (error: unknown) {
      const err = error as { error?: string };
      set({ error: err.error || 'Failed to fetch active jobs', isLoading: false });
    }
  },

  // Fetch job by ID
  fetchJobById: async (id: string) => {
    try {
      const response = await jobsApi.getById(id);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch job:', error);
      return null;
    }
  },

  // Check in vehicle
  checkIn: async (data: CheckInPayload) => {
    set({ isCheckingIn: true, error: null });
    try {
      const response = await jobsApi.checkIn(data);
      const newJob = response.data;

      set((state) => ({
        queue: [...state.queue, newJob],
        isCheckingIn: false,
      }));

      return newJob;
    } catch (error: unknown) {
      const err = error as { error?: string };
      set({ error: err.error || 'Failed to check in vehicle', isCheckingIn: false });
      throw error;
    }
  },

  // Update job status
  updateStatus: async (id: string, status: JobStatus) => {
    try {
      const response = await jobsApi.updateStatus(id, status);
      const updatedJob = response.data;

      set((state) => {
        // Update in queue
        const queueIndex = state.queue.findIndex((j) => j.id === id);
        const newQueue = [...state.queue];
        if (queueIndex !== -1) {
          if (status === 'in_progress' || status === 'washing') {
            // Move from queue to active
            newQueue.splice(queueIndex, 1);
            return {
              queue: newQueue,
              activeJobs: [...state.activeJobs, updatedJob],
              selectedJob: state.selectedJob?.id === id ? updatedJob : state.selectedJob,
            };
          }
          newQueue[queueIndex] = updatedJob;
        }

        // Update in active jobs
        const activeIndex = state.activeJobs.findIndex((j) => j.id === id);
        const newActiveJobs = [...state.activeJobs];
        if (activeIndex !== -1) {
          if (status === 'completed' || status === 'cancelled') {
            // Remove from active
            newActiveJobs.splice(activeIndex, 1);
          } else {
            newActiveJobs[activeIndex] = updatedJob;
          }
        }

        return {
          queue: newQueue,
          activeJobs: newActiveJobs,
          selectedJob: state.selectedJob?.id === id ? updatedJob : state.selectedJob,
        };
      });
    } catch (error: unknown) {
      const err = error as { error?: string };
      set({ error: err.error || 'Failed to update job status' });
      throw error;
    }
  },

  // Assign bay
  assignBay: async (id: string, bayId: string) => {
    try {
      const response = await jobsApi.assignBay(id, bayId);
      const updatedJob = response.data;

      set((state) => ({
        queue: state.queue.map((j) => (j.id === id ? updatedJob : j)),
        activeJobs: state.activeJobs.map((j) => (j.id === id ? updatedJob : j)),
        selectedJob: state.selectedJob?.id === id ? updatedJob : state.selectedJob,
      }));
    } catch (error: unknown) {
      const err = error as { error?: string };
      set({ error: err.error || 'Failed to assign bay' });
      throw error;
    }
  },

  // Assign staff
  assignStaff: async (id: string, staffId: string) => {
    try {
      const response = await jobsApi.assignStaff(id, staffId);
      const updatedJob = response.data;

      set((state) => ({
        queue: state.queue.map((j) => (j.id === id ? updatedJob : j)),
        activeJobs: state.activeJobs.map((j) => (j.id === id ? updatedJob : j)),
        selectedJob: state.selectedJob?.id === id ? updatedJob : state.selectedJob,
      }));
    } catch (error: unknown) {
      const err = error as { error?: string };
      set({ error: err.error || 'Failed to assign staff' });
      throw error;
    }
  },

  // Add service
  addService: async (id: string, serviceId: string, quantity = 1) => {
    try {
      const response = await jobsApi.addService(id, serviceId, quantity);
      const updatedJob = response.data;

      set((state) => ({
        queue: state.queue.map((j) => (j.id === id ? updatedJob : j)),
        activeJobs: state.activeJobs.map((j) => (j.id === id ? updatedJob : j)),
        selectedJob: state.selectedJob?.id === id ? updatedJob : state.selectedJob,
      }));
    } catch (error: unknown) {
      const err = error as { error?: string };
      set({ error: err.error || 'Failed to add service' });
      throw error;
    }
  },

  // Remove service
  removeService: async (id: string, jobServiceId: string) => {
    try {
      const response = await jobsApi.removeService(id, jobServiceId);
      const updatedJob = response.data;

      set((state) => ({
        queue: state.queue.map((j) => (j.id === id ? updatedJob : j)),
        activeJobs: state.activeJobs.map((j) => (j.id === id ? updatedJob : j)),
        selectedJob: state.selectedJob?.id === id ? updatedJob : state.selectedJob,
      }));
    } catch (error: unknown) {
      const err = error as { error?: string };
      set({ error: err.error || 'Failed to remove service' });
      throw error;
    }
  },

  // Apply discount
  applyDiscount: async (id: string, type: 'percentage' | 'fixed', value: number) => {
    try {
      const response = await jobsApi.applyDiscount(id, type, value);
      const updatedJob = response.data;

      set((state) => ({
        queue: state.queue.map((j) => (j.id === id ? updatedJob : j)),
        activeJobs: state.activeJobs.map((j) => (j.id === id ? updatedJob : j)),
        selectedJob: state.selectedJob?.id === id ? updatedJob : state.selectedJob,
      }));
    } catch (error: unknown) {
      const err = error as { error?: string };
      set({ error: err.error || 'Failed to apply discount' });
      throw error;
    }
  },

  // Cancel job
  cancelJob: async (id: string, reason?: string) => {
    try {
      await jobsApi.cancel(id, reason);

      set((state) => ({
        queue: state.queue.filter((j) => j.id !== id),
        activeJobs: state.activeJobs.filter((j) => j.id !== id),
        selectedJob: state.selectedJob?.id === id ? null : state.selectedJob,
      }));
    } catch (error: unknown) {
      const err = error as { error?: string };
      set({ error: err.error || 'Failed to cancel job' });
      throw error;
    }
  },

  // Select job
  selectJob: (job: Job | null) => {
    set({ selectedJob: job });
  },

  // Refresh selected job
  refreshSelectedJob: async () => {
    const { selectedJob } = get();
    if (!selectedJob) return;

    try {
      const response = await jobsApi.getById(selectedJob.id);
      set({ selectedJob: response.data });
    } catch (error) {
      console.error('Failed to refresh selected job:', error);
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

// Selectors
export const useQueue = () => useJobStore((state) => state.queue);
export const useActiveJobs = () => useJobStore((state) => state.activeJobs);
export const useSelectedJob = () => useJobStore((state) => state.selectedJob);
export const useJobLoading = () => useJobStore((state) => state.isLoading);
export const useJobError = () => useJobStore((state) => state.error);
