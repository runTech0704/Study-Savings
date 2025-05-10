"""
URL configuration for study_project project.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('study_tracker.urls')),
    path('accounts/', include('allauth.urls')),
]
