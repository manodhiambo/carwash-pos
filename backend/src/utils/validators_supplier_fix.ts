// Add these to your existing validators.ts file

// Supplier Validators (ADD THIS SECTION)
export const supplierValidators = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Supplier name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('contact_person')
      .optional()
      .trim()
      .isLength({ max: 100 }),
    body('phone')
      .optional()
      .trim()
      .matches(/^(\+?254|0)?[17]\d{8}$/)
      .withMessage('Invalid Kenyan phone number'),
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail(),
    body('address')
      .optional()
      .trim()
      .isLength({ max: 500 }),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }),
  ],

  update: [
    param('id').isInt({ min: 1 }).withMessage('Invalid supplier ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }),
    body('contact_person')
      .optional()
      .trim()
      .isLength({ max: 100 }),
    body('phone')
      .optional()
      .trim()
      .matches(/^(\+?254|0)?[17]\d{8}$/)
      .withMessage('Invalid Kenyan phone number'),
    body('email')
      .optional()
      .trim()
      .isEmail()
      .normalizeEmail(),
    body('is_active')
      .optional()
      .isBoolean(),
  ],
};
