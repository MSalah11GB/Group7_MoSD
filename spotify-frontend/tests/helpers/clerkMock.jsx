// A stand-in for @clerk/clerk-react whose signed-in user tests can change.
export const clerkState = { user: null };

export const setTestUser = (user) => {
    clerkState.user = user;
};

const auth = () => ({
    isLoaded: true,
    isSignedIn: Boolean(clerkState.user),
    userId: clerkState.user?.id ?? null,
    getToken: async () => (clerkState.user ? 'test-token' : null),
});

export const clerkMock = {
    ClerkProvider: ({ children }) => children,
    useUser: () => ({ isLoaded: true, isSignedIn: Boolean(clerkState.user), user: clerkState.user }),
    useAuth: auth,
    SignedIn: ({ children }) => (clerkState.user ? children : null),
    SignedOut: ({ children }) => (clerkState.user ? null : children),
    SignInButton: ({ children }) => children,
    UserButton: () => <div data-testid="user-button" />,
};
