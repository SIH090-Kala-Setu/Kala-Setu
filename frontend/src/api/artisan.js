import { apiClient } from './client';

export const getArtisanDashboard = () => apiClient('/artisan/dashboard');
export const getArtisanProfile = () => apiClient('/artisan/profile');
export const updateArtisanProfile = (formData) => apiClient('/artisan/profile', { method: 'PUT', body: formData });
export const getArtisanAnalytics = () => apiClient('/artisan/analytics');
export const getArtisanReport = () => apiClient('/artisan/report', { rawResponse: true });
export const getProductDetail = (id) => apiClient(`/products/${id}`);
export const deleteProduct = (id) => apiClient(`/products/${id}`, { method: 'DELETE' });
export const updateProductStatus = (id, status) => {
  const fd = new FormData();
  fd.append('status', status);
  return apiClient(`/products/${id}/status`, { method: 'PUT', body: fd });
};
export const updateProductStock = (id, stock_count) => {
  const fd = new FormData();
  fd.append('stock_count', stock_count);
  return apiClient(`/products/${id}/stock`, { method: 'PUT', body: fd });
};
export const getProductQR = (id) => `http://localhost:8000/products/${id}/qr`;
export const respondToInquiry = (inquiryId, message) => {
  const fd = new FormData();
  fd.append('response_message', message);
  return apiClient(`/inquiries/${inquiryId}/respond`, { method: 'POST', body: fd });
};
export const markNotificationRead = (id) => apiClient(`/notifications/${id}/read`, { method: 'PUT' });
export const markAllNotificationsRead = () => apiClient('/notifications/mark-all-read', { method: 'PUT' });
