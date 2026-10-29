import axios from 'axios';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TOKEN_KEY = 'hn_token';

export const api = axios.create({
  baseURL: Config.API_URL,
  timeout: Number(Config.API_TIMEOUT) || 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});