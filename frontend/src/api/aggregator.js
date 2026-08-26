import { apiClient } from './client';

export const getAggregatorDashboard = () => apiClient('/aggregator/dashboard');
export const getAggregatorArtisans = () => apiClient('/aggregator/artisans');
