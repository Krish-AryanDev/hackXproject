/**
 * Async handler wrapper to catch and forward errors to Express next()
 * @param {Function} requestHandler
 * @returns {Function}
 */
export const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
    };
};

export default asyncHandler;
