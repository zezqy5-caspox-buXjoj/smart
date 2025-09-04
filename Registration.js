const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        maxlength: [100, 'Full name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        unique: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        match: [/^[\+]?[0-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    age: {
        type: String,
        required: [true, 'Age range is required'],
        enum: {
            values: ['18-25', '26-30', '31-35', '36-40'],
            message: 'Please select a valid age range'
        }
    },
    occupation: {
        type: String,
        trim: true,
        maxlength: [100, 'Occupation cannot exceed 100 characters']
    },
    goals: {
        type: String,
        required: [true, 'Goals are required'],
        trim: true,
        minlength: [10, 'Goals must be at least 10 characters long'],
        maxlength: [1000, 'Goals cannot exceed 1000 characters']
    },
    experience: {
        type: String,
        trim: true,
        maxlength: [1000, 'Experience cannot exceed 1000 characters']
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
registrationSchema.index({ email: 1 });
registrationSchema.index({ status: 1 });
registrationSchema.index({ createdAt: -1 });
registrationSchema.index({ fullName: 'text', email: 'text' });

// Virtual for formatted date
registrationSchema.virtual('formattedDate').get(function() {
    return this.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
});

// Pre-save middleware to sanitize data
registrationSchema.pre('save', function(next) {
    if (this.fullName) {
        this.fullName = this.fullName.trim();
    }
    if (this.email) {
        this.email = this.email.trim().toLowerCase();
    }
    if (this.phone) {
        this.phone = this.phone.trim();
    }
    if (this.occupation) {
        this.occupation = this.occupation.trim();
    }
    if (this.goals) {
        this.goals = this.goals.trim();
    }
    if (this.experience) {
        this.experience = this.experience.trim();
    }
    next();
});

// Static method to get statistics
registrationSchema.statics.getStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                pending: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                },
                approved: {
                    $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
                },
                rejected: {
                    $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
                }
            }
        }
    ]);
    
    return stats[0] || { total: 0, pending: 0, approved: 0, rejected: 0 };
};

// Static method to get registrations by date range
registrationSchema.statics.getByDateRange = async function(startDate, endDate) {
    return await this.find({
        createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        }
    }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Registration', registrationSchema);
