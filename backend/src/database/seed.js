const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { User, Patient, PrivacyBudget, GlobalThreatScore } = require('../models');
const connectDB = require('./connection');
const { logger } = require('../utils/logger');

// Sample data
const seedData = {
    users: [
        {
            email: 'admin@medsecure.com',
            username: 'admin',
            password: 'SecureAdmin123!',
            firstName: 'System',
            lastName: 'Administrator',
            role: 'admin',
            phoneNumber: '+1234567890',
            isVerified: true,
            isActive: true
        },
        {
            email: 'dr.smith@medsecure.com',
            username: 'drsmith',
            password: 'Doctor123!',
            firstName: 'John',
            lastName: 'Smith',
            role: 'doctor',
            phoneNumber: '+1234567891',
            isVerified: true,
            isActive: true
        },
        {
            email: 'nurse.johnson@medsecure.com',
            username: 'nursejohnson',
            password: 'Nurse123!',
            firstName: 'Mary',
            lastName: 'Johnson',
            role: 'nurse',
            phoneNumber: '+1234567892',
            isVerified: true,
            isActive: true
        },
        {
            email: 'receptionist@medsecure.com',
            username: 'receptionist',
            password: 'Reception123!',
            firstName: 'Sarah',
            lastName: 'Wilson',
            role: 'receptionist',
            phoneNumber: '+1234567893',
            isVerified: true,
            isActive: true
        },
        {
            email: 'patient@medsecure.com',
            username: 'patient',
            password: 'Patient123!',
            firstName: 'David',
            lastName: 'Brown',
            role: 'patient',
            phoneNumber: '+1234567894',
            isVerified: true,
            isActive: true
        }
    ],

    patients: [
        {
            firstName: 'Alice',
            lastName: 'Cooper',
            dateOfBirth: new Date('1990-05-15'),
            gender: 'female',
            phoneNumber: '+1555123456',
            email: 'alice.cooper@email.com',
            address: {
                street: '123 Main St',
                city: 'New York',
                state: 'NY',
                zipCode: '10001',
                country: 'USA'
            },
            bloodType: 'A+',
            allergies: [{
                name: 'Penicillin',
                severity: 'severe',
                notes: 'Causes anaphylaxis'
            }],
            medicalConditions: [{
                condition: 'Diabetes Type 2',
                diagnosedDate: new Date('2020-03-01'),
                status: 'active',
                notes: 'Well controlled with medication'
            }],
            medications: [{
                name: 'Metformin',
                dosage: '500mg',
                frequency: 'Twice daily',
                prescribedBy: 'Dr. Smith',
                startDate: new Date('2020-03-01')
            }],
            emergencyContact: {
                name: 'Bob Cooper',
                relationship: 'Spouse',
                phoneNumber: '+1555123457',
                email: 'bob.cooper@email.com'
            },
            sensitivityLevel: 'high'
        },
        {
            firstName: 'Robert',
            lastName: 'Johnson',
            dateOfBirth: new Date('1985-08-22'),
            gender: 'male',
            phoneNumber: '+1555234567',
            email: 'robert.johnson@email.com',
            address: {
                street: '456 Oak Ave',
                city: 'Los Angeles',
                state: 'CA',
                zipCode: '90210',
                country: 'USA'
            },
            bloodType: 'O-',
            allergies: [],
            medicalConditions: [{
                condition: 'Hypertension',
                diagnosedDate: new Date('2019-06-15'),
                status: 'active',
                notes: 'Managed with lifestyle changes'
            }],
            medications: [{
                name: 'Lisinopril',
                dosage: '10mg',
                frequency: 'Once daily',
                prescribedBy: 'Dr. Smith',
                startDate: new Date('2019-06-15')
            }],
            emergencyContact: {
                name: 'Lisa Johnson',
                relationship: 'Sister',
                phoneNumber: '+1555234568',
                email: 'lisa.johnson@email.com'
            },
            sensitivityLevel: 'medium'
        },
        {
            firstName: 'Emma',
            lastName: 'Davis',
            dateOfBirth: new Date('1995-12-03'),
            gender: 'female',
            phoneNumber: '+1555345678',
            email: 'emma.davis@email.com',
            address: {
                street: '789 Pine St',
                city: 'Chicago',
                state: 'IL',
                zipCode: '60601',
                country: 'USA'
            },
            bloodType: 'B+',
            allergies: [{
                name: 'Shellfish',
                severity: 'moderate',
                notes: 'Causes hives and swelling'
            }],
            medicalConditions: [],
            medications: [],
            emergencyContact: {
                name: 'Michael Davis',
                relationship: 'Father',
                phoneNumber: '+1555345679',
                email: 'michael.davis@email.com'
            },
            sensitivityLevel: 'low'
        }
    ]
};

// Seed function
const seedDatabase = async () => {
    try {
        // Connect to database
        await connectDB();

        logger.info('Seeding database...');

        // Clear existing data
        await User.deleteMany({});
        await Patient.deleteMany({});
        await PrivacyBudget.deleteMany({});
        await GlobalThreatScore.deleteMany({});

        logger.info('Cleared existing data');

        // Create users
        const createdUsers = [];
        for (const userData of seedData.users) {
            const user = await User.create(userData);
            createdUsers.push(user);
            logger.info(`Created user: ${user.email}`);
        }

        // Find doctor for patient assignment
        const doctor = createdUsers.find(user => user.role === 'doctor');
        const admin = createdUsers.find(user => user.role === 'admin');

        // Create patients
        const createdPatients = [];
        for (const patientData of seedData.patients) {
            const patient = await Patient.create({
                ...patientData,
                assignedDoctor: doctor._id,
                createdBy: admin._id
            });
            createdPatients.push(patient);
            logger.info(`Created patient: ${patient.firstName} ${patient.lastName}`);
        }

        // Create privacy budgets for high sensitivity patients
        for (const patient of createdPatients) {
            if (['high', 'critical'].includes(patient.sensitivityLevel)) {
                // Create budget for assigned doctor
                await PrivacyBudget.create({
                    user: doctor._id,
                    patient: patient._id,
                    totalBudget: 10.0,
                    epsilon: 1.0,
                    delta: 0.00001,
                    createdBy: admin._id
                });

                // Create budget for admin
                await PrivacyBudget.create({
                    user: admin._id,
                    patient: patient._id,
                    totalBudget: 15.0,
                    epsilon: 1.0,
                    delta: 0.00001,
                    createdBy: admin._id
                });

                logger.info(`Created privacy budgets for patient: ${patient.firstName} ${patient.lastName}`);
            }
        }

        // Create initial global threat score
        await GlobalThreatScore.create({
            score: 25,
            factors: {
                recentAttacks: 5,
                activeThreats: 2,
                systemLoad: 10,
                externalIntel: 8
            }
        });

        logger.info('Created initial global threat score');

        logger.info('Database seeding completed successfully!');
        logger.info(`Created ${createdUsers.length} users and ${createdPatients.length} patients`);

        // Display login credentials
        console.log('\n=== LOGIN CREDENTIALS ===');
        seedData.users.forEach(user => {
            console.log(`${user.role.toUpperCase()}: ${user.email} / ${user.password}`);
        });
        console.log('========================\n');

        process.exit(0);

    } catch (error) {
        logger.error('Error seeding database:', error);
        process.exit(1);
    }
};

// Run seeder if called directly
if (require.main === module) {
    seedDatabase();
}

module.exports = seedDatabase;