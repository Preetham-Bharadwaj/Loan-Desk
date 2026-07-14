import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loanService } from '../services/api';

export const useApplications = (params = {}) => {
  return useQuery({
    queryKey: ['applications', params],
    queryFn: () => loanService.getApplications(params),
    refetchInterval: 10000, // Poll every 10 seconds for real-time dashboard updates
  });
};

export const useApplicationDetails = (id) => {
  return useQuery({
    queryKey: ['application', id],
    queryFn: () => loanService.getApplicationById(id),
    enabled: !!id,
  });
};

export const useEmployees = () => {
  return useQuery({
    queryKey: ['employees'],
    queryFn: () => loanService.getEmployees(),
  });
};

export const useApplyLoan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData) => loanService.applyLoan(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
};

export const useManagerDecision = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decisionData }) => loanService.submitManagerDecision(id, decisionData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['application', variables.id] });
    },
  });
};

export const useNotifications = (userId) => {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => loanService.getNotifications(userId),
    enabled: !!userId,
    refetchInterval: 15000, // Refresh notifications occasionally
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => loanService.markNotificationRead(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => loanService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useUploadAdditionalDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, documentType, file, customerId }) =>
      loanService.uploadAdditionalDocument(applicationId, documentType, file, customerId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['application', variables.applicationId] });
    },
  });
};
