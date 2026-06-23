const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err.message);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
  }

  if (err.message === 'Only PDF files are allowed.') {
    return res.status(400).json({ error: err.message });
  }

  return res.status(500).json({
    error: 'Internal server error.',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

module.exports = errorHandler;