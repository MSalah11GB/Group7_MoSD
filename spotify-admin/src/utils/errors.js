/** The most helpful message available for a failed request. */
export const errorMessage = (error) =>
    error.response?.data?.message || error.message || 'Error occurred';
