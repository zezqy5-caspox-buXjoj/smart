const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Registration = require('../models/Registration');

// Simple admin authentication (in production, use proper auth)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Welcome2025!';
const JWT_SECRET = process.env.JWT_SECRET || 'd5fd469d4094e7e60cd274dff104ddb3';

// Authentication middleware
const authenticateAdmin = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        req.adminId = decoded.adminId;
        next();
        
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

// POST /api/admin/login - Admin login
router.post('/login', async (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required'
            });
        }
        
        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({
                success: false,
                message: 'Invalid password'
            });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { adminId: 'admin', timestamp: Date.now() },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            message: 'Login successful',
            token,
            expiresIn: '24h'
        });
        
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

// GET /api/admin/registrations - Get all registrations
router.get('/registrations', authenticateAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        
        // Build query
        let query = {};
        if (status && status !== 'all') {
            query.status = status;
        }
        
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Execute query with pagination
        const registrations = await Registration.find(query)
            .sort(sort)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select('-__v');
        
        const total = await Registration.countDocuments(query);
        
        res.json({
            success: true,
            data: {
                registrations,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    total,
                    limit: parseInt(limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Get registrations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch registrations'
        });
    }
});

// GET /api/admin/registrations/:id - Get registration by ID
router.get('/registrations/:id', authenticateAdmin, async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.id);
        
        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }
        
        res.json({
            success: true,
            data: registration
        });
        
    } catch (error) {
        console.error('Get registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch registration'
        });
    }
});

// PATCH /api/admin/registrations/:id/status - Update registration status
router.patch('/registrations/:id/status', authenticateAdmin, async (req, res) => {
    try {
        const { status, notes } = req.body;
        
        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be pending, approved, or rejected'
            });
        }
        
        const updateData = { status };
        if (notes !== undefined) {
            updateData.notes = notes;
        }
        
        const registration = await Registration.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Status updated successfully',
            data: registration
        });
        
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status'
        });
    }
});

// PUT /api/admin/registrations/:id - Update registration
router.put('/registrations/:id', authenticateAdmin, async (req, res) => {
    try {
        const { fullName, phone, age, occupation, goals, experience, notes } = req.body;
        
        const updateData = {};
        if (fullName) updateData.fullName = fullName;
        if (phone) updateData.phone = phone;
        if (age) updateData.age = age;
        if (occupation !== undefined) updateData.occupation = occupation;
        if (goals) updateData.goals = goals;
        if (experience !== undefined) updateData.experience = experience;
        if (notes !== undefined) updateData.notes = notes;
        
        const registration = await Registration.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Registration updated successfully',
            data: registration
        });
        
    } catch (error) {
        console.error('Update registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update registration'
        });
    }
});

// DELETE /api/admin/registrations/:id - Delete registration
router.delete('/registrations/:id', authenticateAdmin, async (req, res) => {
    try {
        const registration = await Registration.findByIdAndDelete(req.params.id);
        
        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Registration deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete registration'
        });
    }
});

// GET /api/admin/stats - Get statistics
router.get('/stats', authenticateAdmin, async (req, res) => {
    try {
        const stats = await Registration.getStats();
        
        // Get today's and this month's registrations
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        
        const todayCount = await Registration.countDocuments({
            createdAt: { $gte: today }
        });
        
        const thisMonthCount = await Registration.countDocuments({
            createdAt: { $gte: thisMonth }
        });
        
        res.json({
            success: true,
            data: {
                ...stats,
                today: todayCount,
                thisMonth: thisMonthCount
            }
        });
        
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
});

// GET /api/admin/export - Export registrations to CSV
router.get('/export', authenticateAdmin, async (req, res) => {
    try {
        const { status, startDate, endDate } = req.query;
        
        let query = {};
        if (status && status !== 'all') {
            query.status = status;
        }
        
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        
        const registrations = await Registration.find(query)
            .sort({ createdAt: -1 })
            .select('-__v');
        
        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="mentorship_registrations_${new Date().toISOString().split('T')[0]}.csv"`);
        
        // CSV header
        const csvHeader = [
            'ID',
            'Full Name',
            'Email',
            'Phone',
            'Age',
            'Occupation',
            'Goals',
            'Experience',
            'Status',
            'Notes',
            'Registration Date'
        ].join(',') + '\n';
        
        res.write(csvHeader);
        
        // CSV data rows
        registrations.forEach(reg => {
            const row = [
                reg._id,
                `"${reg.fullName}"`,
                reg.email,
                reg.phone,
                reg.age,
                `"${reg.occupation || ''}"`,
                `"${reg.goals}"`,
                `"${reg.experience || ''}"`,
                reg.status,
                `"${reg.notes || ''}"`,
                reg.createdAt.toISOString()
            ].join(',') + '\n';
            
            res.write(row);
        });
        
        res.end();
        
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            success: false,
            message: 'Export failed'
        });
    }
});

module.exports = router;
