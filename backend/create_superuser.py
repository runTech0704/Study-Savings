from django.contrib.auth.models import User
from django.db import IntegrityError

try:
    User.objects.create_superuser('admin', 'admin@example.com', 'adminpassword')
    print("Superuser created successfully")
except IntegrityError:
    print("Superuser already exists")
