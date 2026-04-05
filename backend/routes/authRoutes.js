const express = require('express');
const pool = require('../db');  // imports pool from db.js

const router = express.Router();

/**
 * POST /auth/Login
 * Body: { email, password}
 * Response:
 *  200 + {user_id, username, role } on success
 *  401 + {error} on failure
 */
router.post('/login', async (req, res) => {
    const {email, password} = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).json({error: "Email and password are required."});
    }
    try {
        // In this project, we treat the username as email
        const result = await pool.query(
            'SELECT user_id, username, password_hash, role FROM users WHERE username = $1', 
            [email]
        );
        if (result.rows.length === 0) {
            // No user with that email
            return res.status(401).json({error: "Invalid email or password."});
        }
        const user = result.rows[0];

        // password_hash is currently plain text, needs to be changed to use bcrypt.compare()
        if (password !== user.password_hash) {
            return res.status(401).json({error: "Invalid email or password"});
        }

        // Login successful
        return res.json({
            user_id: user.user_id,
            username: user.username,
            role: user.role,
        });

    } catch (err) {
        console.error('Error in /auth/login: ', err);
        res.status(500).json({error: 'Internal server error.'})
    }
});
module.exports = router; 