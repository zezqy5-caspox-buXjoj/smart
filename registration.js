const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');

// Validation middleware
const validateRegistration = (req, res, next) => {
    const { fullName, email, phone, age, goals } = req.body;
    
    if (!fullName || fullName.trim().length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Full name is required and must be at least 2 characters long'
        });
    }
    
    if (!email || !email.includes('@')) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a valid email address'
        });
    }
    
    if (!phone || phone.trim().length < 10) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a valid phone number'
        });
    }
    
    if (!age || !['18-25', '26-30', '31-35', '36-40'].includes(age)) {
        return res.status(400).json({
            success: false,
            message: 'Please select a valid age range'
        });
    }
    
    if (!goals || goals.trim().length < 10) {
        return res.status(400).json({
            success: false,
            message: 'Please provide your goals (minimum 10 characters)'
        });
    }
    
    next();
};

// POST /api/registration - Create new registration
router.post('/', validateRegistration, async (req, res) => {
    try {
        const {
            fullName,
            email,
            phone,
            age,
            occupation,
            goals,
            experience
        } = req.body;

        // Check if email already exists
        const existingRegistration = await Registration.findOne({ email: email.toLowerCase() });
        
        if (existingRegistration) {
            return res.status(409).json({
                success: false,
                message: 'This email address is already registered'
            });
        }

        // Create new registration
        const registration = new Registration({
            fullName,
            email,
            phone,
            age,
            occupation: occupation || '',
            goals,
            experience: experience || ''
        });

        await registration.save();

        res.status(201).json({
            success: true,
            message: 'Registration successful! We\'ll contact you soon.',
            data: {
                id: registration._id,
                fullName: registration.fullName,
                email: registration.email
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'This email address is already registered'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again later.'
        });
    }
});

// GET /api/registration/:id - Get registration by ID
router.get('/:id', async (req, res) => {
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
            message: 'Failed to retrieve registration'
        });
    }
});

// PUT /api/registration/:id - Update registration
router.put('/:id', async (req, res) => {
    try {
        const { fullName, phone, age, occupation, goals, experience } = req.body;
        
        const updateData = {};
        if (fullName) updateData.fullName = fullName;
        if (phone) updateData.phone = phone;
        if (age) updateData.age = age;
        if (occupation !== undefined) updateData.occupation = occupation;
        if (goals) updateData.goals = goals;
        if (experience !== undefined) updateData.experience = experience;
        
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

// DELETE /api/registration/:id - Delete registration
router.delete('/:id', async (req, res) => {
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

module.exports = router;
