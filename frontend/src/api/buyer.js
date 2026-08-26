import { apiClient } from './client';

export const getBuyerDashboard = () => apiClient('/buyer/dashboard');
