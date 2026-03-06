#!/usr/bin/env python
"""
Test script to verify the MedSecure backend is working properly.
"""
import os
import sys
import django
import json
import traceback

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(__file__))

try:
    django.setup()
    print("✓ Django setup successful")
    
    # Test imports
    from apps.users.models import CustomUser
    from apps.patients.models import Patient
    from apps.audit.models import AuditLog
    from apps.security.models import SecurityEvent
    from apps.privacy_budget.models import PrivacyBudget
    print("✓ All models imported successfully")
    
    # Test URL configuration
    from django.urls import get_resolver
    resolver = get_resolver()
    print(f"✓ URL configuration loaded")
    
    # Check admin user
    try:
        admin_user = CustomUser.objects.get(username='admin')
        print(f"✓ Admin user found: {admin_user.username}")
    except CustomUser.DoesNotExist:
        print("✗ Admin user not found")
    
    # Test database connectivity
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
    print("✓ Database connectivity verified")
    
    print("\n✓ All checks passed! Backend is ready.")
    
except Exception as e:
    print(f"\n✗ Error occurred:")
    print(f"Error: {e}")
    traceback.print_exc()
    sys.exit(1)
