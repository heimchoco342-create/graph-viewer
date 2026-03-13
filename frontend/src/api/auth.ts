import apiClient from './client';
import type { AuthResponse, User } from '../types';

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/api/auth/login', { email, password });
  return data;
}

export async function register(email: string, password: string, name: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/api/auth/register', { email, password, name });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>('/api/auth/me');
  return data;
}
