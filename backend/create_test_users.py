#!/usr/bin/env python
"""
Create role-based test users for MedSecure.

Credentials:
  doctor@gmail.com   / doctor
  admin@gmail.com    / admin
  nurse@gmail.com    / nurse
  receptionist@gmail.com / receptionist
  patient@gmail.com  / patient
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import CustomUser

USERS = [
    {
        'email': 'doctor@gmail.com',
        'username': 'doctor',
        'password': 'doctor',
        'first_name': 'Sarah',
        'last_name': 'Jenkins',
        'role': 'doctor',
    },
    {
        'email': 'admin@gmail.com',
        'username': 'admin',
        'password': 'admin',
        'first_name': 'System',
        'last_name': 'Administrator',
        'role': 'admin',
        'is_superuser': True,
        'is_staff': True,
    },
    {
        'email': 'nurse@gmail.com',
        'username': 'nurse',
        'password': 'nurse',
        'first_name': 'Maria',
        'last_name': 'Rodriguez',
        'role': 'nurse',
    },
    {
        'email': 'receptionist@gmail.com',
        'username': 'receptionist',
        'password': 'receptionist',
        'first_name': 'Lisa',
        'last_name': 'Chen',
        'role': 'receptionist',
    },
    {
        'email': 'patient@gmail.com',
        'username': 'patient',
        'password': 'patient',
        'first_name': 'John',
        'last_name': 'Patterson',
        'role': 'patient',
    },
]


def create_test_users():
    print("Creating role-based test users...\n")
    for data in USERS:
        password = data.pop('password')
        email = data['email']
        role = data['role']
        try:
            user, created = CustomUser.objects.update_or_create(
                email=email,
                defaults={
                    **data,
                    'is_verified': True,
                    'is_active': True,
                }
            )
            user.set_password(password)
            user.save()
            status = 'Created' if created else 'Updated'
            print(f"  [{status}] {email}  |  role: {role}  |  password: {password}")
        except Exception as e:
            print(f"  [ERROR] {email}: {e}")
        # restore password for loop safety
        data['password'] = password

    print("\nDone! You can now log in with the credentials above.")


if __name__ == '__main__':
    create_test_users()
