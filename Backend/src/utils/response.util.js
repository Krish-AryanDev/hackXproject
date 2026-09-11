/**
 * Standardized API Response Utilities
 */

/**
 * Send standard successful response
 */
export const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        statusCode,
        message,
        data,
    });
};

/**
 * Send created response (201)
 */
export const sendCreated = (res, data = null, message = 'Resource created successfully') => {
    return sendSuccess(res, data, message, 201);
};

/**
 * Send paginated response
 */
export const sendPaginated = (res, items = [], pagination = {}, message = 'Data retrieved successfully') => {
    return res.status(200).json({
        success: true,
        statusCode: 200,
        message,
        data: {
            items,
            pagination: {
                page: pagination.page || 1,
                limit: pagination.limit || items.length,
                totalItems: pagination.totalItems || items.length,
                totalPages: pagination.totalPages || 1,
                hasNextPage: pagination.hasNextPage || false,
                hasPrevPage: pagination.hasPrevPage || false,
            },
        },
    });
};

export default {
    sendSuccess,
    sendCreated,
    sendPaginated,
};
