import Constants from 'expo-constants';

// Get API URL from app.json extra config or environment variable
export const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000';

export const API_BASE_URL = `${API_URL}/api/v1`;

export const config = {
  apiUrl: API_URL,
  apiBaseUrl: API_BASE_URL,
};
