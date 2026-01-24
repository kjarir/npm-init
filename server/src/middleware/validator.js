/**
 * Validate request body fields
 * @param {Array<string>} requiredFields - Array of required field names
 */
export const validateFields = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: 'Missing required fields',
        missingFields
      });
    }

    next();
  };
};

/**
 * Validate numeric fields
 */
export const validateNumeric = (fields) => {
  return (req, res, next) => {
    const invalidFields = [];

    for (const field of fields) {
      const value = req.body[field];
      if (value !== undefined && (isNaN(value) || value <= 0)) {
        invalidFields.push(field);
      }
    }

    if (invalidFields.length > 0) {
      return res.status(400).json({
        message: 'Invalid numeric values',
        invalidFields
      });
    }

    next();
  };
};
