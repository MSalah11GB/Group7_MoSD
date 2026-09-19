import axios from 'axios';
import { API_BASE_URL } from './api';

// Never let a slow or blocked Clerk hold up the public catalog: after this, the request goes out anonymously.
const TOKEN_TIMEOUT_MS = 3000;

let getToken = null;

export const setTokenGetter = (fn) => {
    getToken = fn;
};

const tokenOrNull = (promise) =>
    Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), TOKEN_TIMEOUT_MS))]);

// Requests to our API carry the Clerk session token when there is one; the backend derives the user from it.
export const attachToken = async (config) => {
    if (getToken && config.url?.startsWith(API_BASE_URL)) {
        try {
            const token = await tokenOrNull(Promise.resolve(getToken()));
            if (token) config.headers.Authorization = `Bearer ${token}`;
        } catch {
            // Not signed in: continue anonymously.
        }
    }
    return config;
};

axios.interceptors.request.use(attachToken);
