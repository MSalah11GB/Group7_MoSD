import axios from 'axios';
import { url } from './api';

let getToken = null;

export const setTokenGetter = (fn) => {
    getToken = fn;
};

// Every request to the API carries the Clerk session token; the backend checks the admin role.
axios.interceptors.request.use(async (config) => {
    if (getToken && config.url?.startsWith(url)) {
        const token = await getToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// The pages read business-rule errors (duplicate name, validation, not found) from response.data
// and show them as toasts, so hand those 4xx bodies back as normal responses.
// Auth failures (401/403) and server errors still reject.
axios.interceptors.response.use(undefined, (error) => {
    const res = error.response;
    if (res && [400, 404, 409, 413, 422].includes(res.status) && res.data?.success === false) {
        return res;
    }
    return Promise.reject(error);
});
