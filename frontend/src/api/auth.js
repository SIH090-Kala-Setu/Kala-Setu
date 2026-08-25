import { apiClient } from './client';

export async function loginUser(username, password) {
  return apiClient('/auth/login', {
    body: { username, password }
  });
}

export async function registerUser({ username, password, role, region, preferred_lang, craft_type, aadhaar_number }) {
  return apiClient('/auth/register', {
    body: {
      username,
      password,
      role: role || 'Artisan',
      region: region || 'Uttar Pradesh',
      preferred_lang: preferred_lang || 'Hindi',
      craft_type: craft_type || 'Handicrafts',
      aadhaar_number: aadhaar_number || null
    }
  });
}

export async function getMe() {
  return apiClient('/auth/me');
}

