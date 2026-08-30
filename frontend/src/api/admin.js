import { apiClient } from './client';

// ─── 1. Artisan KYC Verifications ───────────────────────────────────────────
export async function getVerifications(statusFilter = null, kycFilter = null) {
  let url = '/admin/verifications';
  const params = new URLSearchParams();
  if (statusFilter && statusFilter !== 'all') {
    params.append('status_filter', statusFilter);
  }
  if (kycFilter && kycFilter !== 'all') {
    params.append('kyc_filter', kycFilter);
  }
  const queryString = params.toString();
  if (queryString) {
    url += `?${queryString}`;
  }
  return apiClient(url);
}

export async function reviewVerification(id, { status, rejection_reason = '', aadhaar_verified = true, bank_verified = true }) {
  return apiClient(`/admin/verifications/${id}/review`, {
    body: {
      status,
      rejection_reason,
      aadhaar_verified,
      bank_verified
    }
  });
}

// ─── 2. Cluster & Programme Management ──────────────────────────────────────
export async function getClusters() {
  return apiClient('/clusters');
}

export async function createCluster({ cluster_name, state, district, craft_specialization }) {
  return apiClient('/clusters', {
    body: { cluster_name, state, district, craft_specialization }
  });
}

export async function getClusterMembers(clusterId) {
  return apiClient(`/clusters/${clusterId}/artisans`);
}

export async function addArtisanToCluster(clusterId, artisanId) {
  return apiClient(`/clusters/${clusterId}/artisans?artisan_id=${artisanId}`, {
    method: 'POST'
  });
}

export async function getClusterStats(clusterId) {
  return apiClient(`/admin/clusters/${clusterId}/stats`);
}

// ─── 3. Exhibition & Trade Fair Integration ─────────────────────────────────
export async function getExhibitions() {
  return apiClient('/admin/exhibitions');
}

export async function createExhibition({ name, location, start_date, end_date }) {
  return apiClient('/admin/exhibitions', {
    body: { name, location, start_date, end_date }
  });
}

export async function updateExhibitionStatus(exhibitionId, status) {
  return apiClient(`/admin/exhibitions/${exhibitionId}/status?status=${encodeURIComponent(status)}`, {
    method: 'PUT'
  });
}

export async function getExhibitionRegistrationsDetailed(exhibitionId) {
  return apiClient(`/admin/exhibitions/${exhibitionId}/registrations/detailed`);
}

export async function reviewExhibitionRegistration(registrationId, status) {
  const formData = new FormData();
  formData.append('status', status);
  return apiClient(`/admin/exhibitions/registrations/${registrationId}/status`, {
    body: formData
  });
}

export async function registerForExhibition(exhibitionId) {
  return apiClient(`/admin/exhibitions/${exhibitionId}/register`, {
    method: 'POST'
  });
}

// ─── 4. Government Scheme Alerts & Broadcasts ───────────────────────────────
export async function getGovtSchemes() {
  return apiClient('/admin/schemes');
}

export async function createGovtScheme({ scheme_name, description, eligibility_criteria, application_url, valid_until }) {
  return apiClient('/admin/schemes', {
    body: { scheme_name, description, eligibility_criteria, application_url, valid_until }
  });
}

export async function updateGovtScheme(schemeId, updates) {
  return apiClient(`/admin/schemes/${schemeId}`, {
    method: 'PUT',
    body: updates
  });
}

export async function broadcastSchemeAlert(schemeId, { target_state, target_craft_type }) {
  return apiClient(`/admin/schemes/${schemeId}/alert`, {
    body: { target_state, target_craft_type }
  });
}

export async function getSchemeAlertHistory(schemeId) {
  return apiClient(`/admin/schemes/${schemeId}/alerts`);
}

// ─── 5. Product Listing Moderation ──────────────────────────────────────────
export async function getFlaggedProducts() {
  return apiClient('/admin/products/flagged');
}

export async function moderateProduct(productId, status, reason = '') {
  return apiClient(`/admin/products/${productId}/moderate`, {
    body: { status, reason }
  });
}

// ─── 6. Platform Impact Analytics ───────────────────────────────────────────
export async function getAdminAnalytics() {
  return apiClient('/admin/analytics');
}

// ─── 7. B2B Buyer Verification ──────────────────────────────────────────────
export async function getAllBuyers() {
  return apiClient('/admin/buyers');
}

export async function verifyBuyer(buyerId, verify = true) {
  return apiClient(`/admin/buyers/${buyerId}/verify?verify=${verify}`, {
    method: 'POST'
  });
}

// ─── 8. System Users & Audit Logs ───────────────────────────────────────────
export async function getAllUsers() {
  return apiClient('/admin/users');
}

export async function getAuditLogs() {
  return apiClient('/admin/audit-logs');
}

