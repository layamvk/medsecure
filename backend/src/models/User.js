const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [50, 'Username cannot exceed 50 characters']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false
    },
    firstName: {
        type: String,
        trim: true,
        maxlength: [100, 'First name cannot exceed 100 characters']
    },
    lastName: {
        type: String,
        trim: true,
        maxlength: [100, 'Last name cannot exceed 100 characters']
    },
    role: {
        type: String,
        required: [true, 'Role is required'],
        enum: {
            values: ['admin', 'doctor', 'nurse', 'receptionist', 'patient', 'staff'],
            message: 'Role must be one of: admin, doctor, nurse, receptionist, patient, staff'
        },
        default: 'patient'
    },
    phoneNumber: {
        type: String,
        trim: true,
        match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number']
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isMfaEnabled: {
        type: Boolean,
        default: false
    },
    lastLoginIp: {
        type: String,
        validate: {
            validator: function(v) {
                if (!v) return true;
                
                // IPv4 pattern
                const ipv4 = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
                // IPv6 pattern (simplified)
                const ipv6 = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
                // IPv6 localhost
                const ipv6Local = /^::1$/;
                // IPv4-mapped IPv6
                const ipv4Mapped = /^::ffff:[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/;
                
                return ipv4.test(v) || ipv6.test(v) || ipv6Local.test(v) || ipv4Mapped.test(v);
            },
            message: 'Please provide a valid IP address'
        }
    },
    lastLogin: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    emailVerificationToken: String,
    emailVerificationExpire: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Index for performance
userSchema.index({ email: 1, role: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1, isActive: 1 });

// Encrypt password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
        { 
            id: this._id,
            email: this.email,
            role: this.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
    );
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function() {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
        { id: this._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRE }
    );
};

module.exports = mongoose.model('User', userSchema);