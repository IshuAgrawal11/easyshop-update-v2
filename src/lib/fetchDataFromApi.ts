import axios from "axios";

// Get the base URL from environment or use window.location.origin in the browser
const baseURL = typeof window !== 'undefined'
  ? `${window.location.origin}/api`
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api');

// The auth token lives in an httpOnly cookie, so the browser attaches it to
// every same-origin request automatically as long as `withCredentials` is
// set — there is no need (and no way, from client JS) to read it manually.
export const axiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

const fetchData = {
  get: async (url: string, params = {}) => {
    return axiosInstance.get(url, { params });
  },
  post: async (url: string, data = {}) => {
    return axiosInstance.post(url, data);
  },
  put: async (url: string, data = {}) => {
    return axiosInstance.put(url, data);
  },
};

export default fetchData;
