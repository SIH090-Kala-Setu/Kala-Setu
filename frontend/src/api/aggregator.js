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

// Cluster management
export const getAllClusters = (unassigned = false) =>
  apiClient(`/clusters${unassigned ? '?unassigned=true' : ''}`);

export const getMyClusters = () => apiClient('/clusters/my-clusters');

export const joinCluster = (clusterId) =>
  apiClient('/aggregator/join-cluster', { body: { cluster_id: clusterId } });

export const createCluster = (clusterData) =>
  apiClient('/clusters', { body: clusterData });
