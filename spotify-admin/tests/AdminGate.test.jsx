import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import axios from 'axios';
import AdminGate from '../src/components/AdminGate.jsx';
import { mockApi } from './helpers.jsx';

const auth = { isLoaded: true, isSignedIn: true, userId: 'user_1', getToken: async () => 'token' };

vi.mock('@clerk/clerk-react', () => ({
    useAuth: () => globalThis.__auth,
    SignIn: () => <div>sign-in form</div>,
    UserButton: () => <div>user button</div>,
}));

const renderGate = (state = {}) => {
    globalThis.__auth = { ...auth, ...state };
    return render(<AdminGate><p>secret admin content</p></AdminGate>);
};

describe('AdminGate', () => {
    test('shows a loading message until Clerk is ready', () => {
        renderGate({ isLoaded: false });
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    test('asks signed-out visitors to sign in and never asks the API', () => {
        renderGate({ isSignedIn: false, userId: null });

        expect(screen.getByText('sign-in form')).toBeInTheDocument();
        expect(screen.queryByText('secret admin content')).not.toBeInTheDocument();
        expect(axios.get).not.toHaveBeenCalled();
    });

    test('shows the panel only when the API confirms the user is an admin', async () => {
        mockApi({ me: { userId: 'user_1', isAdmin: true } });
        renderGate();

        expect(screen.getByText('Checking permissions...')).toBeInTheDocument();
        expect(await screen.findByText('secret admin content')).toBeInTheDocument();
        expect(axios.get).toHaveBeenCalledWith(expect.stringMatching(/\/api\/auth\/me$/));
    });

    test('turns away signed-in users who are not admins', async () => {
        mockApi({ me: { userId: 'user_1', isAdmin: false } });
        renderGate();

        expect(await screen.findByText('Your account does not have admin access.')).toBeInTheDocument();
        expect(screen.queryByText('secret admin content')).not.toBeInTheDocument();
    });

    test('reports an unreachable server instead of showing the panel', async () => {
        axios.get.mockRejectedValue(new Error('Network Error'));
        renderGate();

        expect(await screen.findByText(/Could not reach the server/)).toBeInTheDocument();
        expect(screen.queryByText('secret admin content')).not.toBeInTheDocument();
    });
});
