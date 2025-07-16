const express = require('express');
const { register, login } = require('../controllers/authController');

const router = express.Router();

/**
 * @route POST /api/register
 * @desc Register a new user
 * @body { email: string, password: string }
 * @returns 201 { message: 'User registered successfully' }
 * @returns 400 { error: 'Validation error message' }
 * @returns 409 { error: 'Email already registered' }
 */
router.post('/register', register);

/**
 * @route POST /api/login
 * @desc Login a user
 * @body { email: string, password: string }
 * @returns 200 { message: 'Login successful' }
 * @returns 400 { error: 'Validation error message' }
 * @returns 401 { error: 'Invalid email or password' }
 */
router.post('/login', login);

module.exports = router;