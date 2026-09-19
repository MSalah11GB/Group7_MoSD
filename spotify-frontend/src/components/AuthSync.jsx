import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { setTokenGetter } from '../config/authToken';

/** Gives API requests the Clerk session token and mirrors the signed-in user into the backend. */
const AuthSync = () => {
    const { getToken, isLoaded, isSignedIn, userId } = useAuth();

    // Signed-out visitors (and a Clerk that has not loaded) get no token, and no waiting for one.
    useEffect(() => {
        setTokenGetter(isSignedIn ? getToken : null);
    }, [getToken, isSignedIn]);

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        axios.post(`${API_BASE_URL}/api/auth/sync`).catch((error) => {
            console.warn('Error syncing user with backend:', error.message);
        });
    }, [isLoaded, isSignedIn, userId]);

    return null;
};

export default AuthSync;
