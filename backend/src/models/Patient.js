const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    patientId: {
        type: String,
        required: [true, 'Patient ID is required'],
        unique: true,
        trim: true,
        maxlength: [20, 'Patient ID cannot exceed 20 characters']
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [100, 'First name cannot exceed 100 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [100, 'Last name cannot exceed 100 characters']
    },
    dateOfBirth: {
        type: Date,
        required: [true, 'Date of birth is required'],
        validate: {
            validator: function(v) {
                return v <= new Date();
            },
            message: 'Date of birth cannot be in the future'
        }
    },
    gender: {
        type: String,
        required: [true, 'Gender is required'],
        enum: {
            values: ['male', 'female', 'other', 'prefer-not-to-say'],
            message: 'Gender must be one of: male, female, other, prefer-not-to-say'
        }
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number']
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: { type: String, default: 'USA' }
    },
    
    // Medical Information
    bloodType: {
        type: String,
        enum: {
            values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''],
            message: 'Blood type must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-'
        }
    },
    allergies: [{
        name: { type: String, required: true },
        severity: {
            type: String,
            enum: ['mild', 'moderate', 'severe'],
            default: 'mild'
        },
        notes: String
    }],
    medicalConditions: [{
        condition: { type: String, required: true },
        diagnosedDate: Date,
        status: {
            type: String,
            enum: ['active', 'resolved', 'chronic'],
            default: 'active'
        },
        notes: String
    }],
    medications: [{
        name: { type: String, required: true },
        dosage: String,
        frequency: String,
        prescribedBy: String,
        startDate: Date,
        endDate: Date,
        notes: String
    }],
    emergencyContact: {
        name: {
            type: String,
            required: [true, 'Emergency contact name is required']
        },
        relationship: String,
        phoneNumber: {
            type: String,
            required: [true, 'Emergency contact phone is required'],
            match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid emergency contact phone number']
        },
        email: {
            type: String,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid emergency contact email']
        }
    },
    
    // Sensitivity and Access Control
    sensitivityLevel: {
        type: String,
        required: [true, 'Sensitivity level is required'],
        enum: {
            values: ['low', 'medium', 'high', 'critical'],
            message: 'Sensitivity level must be one of: low, medium, high, critical'
        },
        default: 'medium'
    },
    assignedDoctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        validate: {
            validator: async function(doctorId) {
                if (!doctorId) return true;
                const User = mongoose.model('User');
                const doctor = await User.findById(doctorId);
                return doctor && doctor.role === 'doctor';
            },
            message: 'Assigned doctor must be a user with doctor role'
        }
    },
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Created by user is required']
    },
    lastAccessedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastAccessedAt: Date,
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for full name
patientSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
patientSchema.virtual('age').get(function() {
    if (!this.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
});

// Indexes for performance
patientSchema.index({ patientId: 1 });
patientSchema.index({ firstName: 1, lastName: 1 });
patientSchema.index({ assignedDoctor: 1 });
patientSchema.index({ sensitivityLevel: 1 });
patientSchema.index({ createdBy: 1 });
patientSchema.index({ email: 1 });
patientSchema.index({ phoneNumber: 1 });

// Generate unique patient ID
patientSchema.pre('save', async function(next) {
    if (!this.isNew || this.patientId) return next();
    
    // Generate patient ID: P + YYYYMMDD + 4-digit counter
    const today = new Date();
    const dateStr = today.getFullYear().toString() + 
                   (today.getMonth() + 1).toString().padStart(2, '0') + 
                   today.getDate().toString().padStart(2, '0');
    
    // Find the highest patient ID for today
    const regex = new RegExp(`^P${dateStr}\\d{4}$`);
    const lastPatient = await this.constructor.findOne(
        { patientId: regex },
        {},
        { sort: { patientId: -1 } }
    );
    
    let counter = 1;
    if (lastPatient) {
        const lastCounter = parseInt(lastPatient.patientId.slice(-4));
        counter = lastCounter + 1;
    }
    
    this.patientId = `P${dateStr}${counter.toString().padStart(4, '0')}`;
    next();
});

module.exports = mongoose.model('Patient', patientSchema);