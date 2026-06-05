import type { AxiosRequestConfig } from 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** When true, the request interceptor will not attach the Bearer token. */
    skipAuth?: boolean;
    /** When true, the global overlay loader is not shown for this request. */
    skipGlobalLoader?: boolean;
  }

  export interface InternalAxiosRequestConfig {
    skipAuth?: boolean;
    skipGlobalLoader?: boolean;
  }
}

export type ApiRequestConfig<D = unknown> = AxiosRequestConfig<D>;
