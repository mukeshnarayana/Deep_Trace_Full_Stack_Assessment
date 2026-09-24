/**
 * Helper to structure standard success responses
 */
const sendSuccess = (res, statusCode = 200, message = 'Success', data = null) => {
  const response = {
    success: true,
    message
  };
  if (data !== null) {
    response.data = data;
  }
  return res.status(statusCode).json(response);
};

/**
 * Helper to structure paginated responses
 * Response format: { data, page, limit, total, totalPages }
 */
const sendPaginated = (res, data, page, limit, total) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const totalPages = Math.ceil(total / parsedLimit) || 1;

  return res.status(200).json({
    success: true,
    data,
    page: parsedPage,
    limit: parsedLimit,
    total,
    totalPages
  });
};

module.exports = {
  sendSuccess,
  sendPaginated
};
