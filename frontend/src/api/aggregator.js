import { apiClient } from './client';

export const getAggregatorDashboard = () => apiClient('/aggregator/dashboard');

export const getAggregatorArtisans = () => apiClient('/aggregator/artisans');

export const assistedOnboardArtisan = (artisanData) => apiClient('/aggregator/artisans/onboard', {
  body: artisanData
});

export const relaySchemeToArtisans = (relayData) => apiClient('/aggregator/schemes/relay', {
  body: relayData
});

export const submitAggregatorReport = (reportData) => apiClient('/aggregator/reports/submit', {
  body: reportData
});
