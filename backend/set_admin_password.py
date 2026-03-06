import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import CustomUser

try:
    admin = CustomUser.objects.get(username='admin')
    admin.set_password('admin123')
    admin.role = 'admin'
    admin.is_superuser = True
    admin.is_staff = True
    admin.is_verified = True
    admin.save()
    print("Admin password set to 'admin123'")
    print("Username: admin")
    print("Password: admin123")
except CustomUser.DoesNotExist:
    print("Admin user not found")
