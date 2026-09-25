import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach Access Token & Selected Branch ID
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('ks_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const branchId = localStorage.getItem('ks_selected_branch_id');
    if (
      branchId &&
      branchId !== 'undefined' &&
      branchId !== 'null' &&
      config.headers
    ) {
      config.headers['X-Branch-ID'] = branchId;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Handle Refresh Token on 401
api.interceptors.response.use(
  (response) => {
    // Backend wraps response in { success: true, data: ... }
    if (
      response.data &&
      typeof response.data === 'object' &&
      'data' in response.data
    ) {
      const normalize = (v: any): any => {
        if (Array.isArray(v)) return v.map(normalize);
        if (!v || typeof v !== 'object') return v;
        const r: any = Object.fromEntries(
          Object.entries(v).map(([k, x]) => [k, normalize(x)]),
        );
        if (r.status_category) {
          r.is_completed = r.status_category === 'DONE';
          r.is_initial = r.status_category === 'TODO';
          r.is_cancelled = r.status_category === 'CANCELLED';
        }
        const aliases: Record<string, string> = {
          color_hex: 'color_code',
          sequence_order: 'stage_order',
          type_name: 'task_type_name',
          type_color: 'task_type_color',
          planned_end_date: 'planned_due_date',
          actual_end_date: 'actual_completed_date',
          author_name: 'user_name',
          original_file_name: 'original_name',
          s3_object_key: 's3_key',
          dept_name: 'department_name',
          desig_name: 'designation_name',
        };
        for (const [source, target] of Object.entries(aliases))
          if (source in r && !(target in r)) r[target] = r[source];
        if (r.full_name || r.name) {
          const name = r.full_name || r.name;
          r.first_name ??= name;
          r.last_name ??= '';
        }
        if (r.userId) r.user_id ??= r.userId;
        return r;
      };
      return normalize(response.data);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh-token')
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('ks_refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        processQueue(error);
        localStorage.removeItem('ks_access_token');
        localStorage.removeItem('ks_user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(
          `${api.defaults.baseURL}/auth/refresh-token`,
          {
            refreshToken,
          },
        );

        const newAccessToken =
          refreshResponse.data?.data?.accessToken ||
          refreshResponse.data?.accessToken;
        if (!newAccessToken)
          throw new Error('Refresh response contains no access token');
        const newRefreshToken = refreshResponse.data?.data?.refreshToken;
        if (newRefreshToken)
          localStorage.setItem('ks_refresh_token', newRefreshToken);
        localStorage.setItem('ks_access_token', newAccessToken);

        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('ks_access_token');
        localStorage.removeItem('ks_refresh_token');
        localStorage.removeItem('ks_user');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
