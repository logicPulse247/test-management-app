import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { globalLoadingActions } from '@/store/globalLoading.store';
import { clearAuthToken, getAuthToken } from './constants';
import './types';

function shouldTrackLoader(
  config: InternalAxiosRequestConfig | undefined,
): boolean {
  return config?.skipGlobalLoader !== true;
}

function trackRequestStart(config: InternalAxiosRequestConfig): void {
  if (shouldTrackLoader(config)) {
    globalLoadingActions.startRequest();
  }
}

function trackRequestEnd(config: InternalAxiosRequestConfig | undefined): void {
  if (shouldTrackLoader(config)) {
    globalLoadingActions.endRequest();
  }
}

export type UnauthorizedHandler = () => void;

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!baseUrl) {
    throw new Error(
      'VITE_API_BASE_URL is not defined. Add it to your .env file.',
    );
  }

  return baseUrl;
}

let unauthorizedHandler: UnauthorizedHandler = () => {
  clearAuthToken();
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
};

let isHandlingUnauthorized = false;

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

function handleUnauthorized(): void {
  if (isHandlingUnauthorized) {
    return;
  }

  isHandlingUnauthorized = true;
  try {
    unauthorizedHandler();
  } finally {
    isHandlingUnauthorized = false;
  }
}

const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    trackRequestStart(config);

    if (config.skipAuth) {
      return config;
    }

    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.config) {
      trackRequestEnd(error.config);
    }
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    trackRequestEnd(response.config);
    return response;
  },
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      trackRequestEnd(error.config);
      if (error.response?.status === 401) {
        handleUnauthorized();
      }
    }

    return Promise.reject(error);
  },
);

export { apiClient };
export default apiClient;
