import { apiClient } from './client';

export async function createInquiry({ product_id, buyer_name, buyer_email, quantity, notes }) {
  return apiClient('/inquiries', {
    body: {
      product_id,
      buyer_name,
      buyer_email,
      quantity: parseInt(quantity, 10) || 1,
      notes: notes || ''
    }
  });
}

export async function getInquiries() {
  return apiClient('/inquiries');
}

export async function getNotifications() {
  return apiClient('/notifications');
}

