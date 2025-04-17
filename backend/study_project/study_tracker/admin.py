from django.contrib import admin
from .models import Subject, StudySession, SavingsGoal


class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'hourly_rate', 'created_at')
    list_filter = ('user',)
    search_fields = ('name',)


class StudySessionAdmin(admin.ModelAdmin):
    list_display = ('subject', 'user', 'start_time', 'end_time', 'duration', 'earned_amount')
    list_filter = ('user', 'subject', 'start_time')
    search_fields = ('subject__name', 'notes')


class SavingsGoalAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'target_amount', 'current_amount', 'progress_percentage', 'deadline', 'is_achieved')
    list_filter = ('user', 'is_achieved')
    search_fields = ('title',)


admin.site.register(Subject, SubjectAdmin)
admin.site.register(StudySession, StudySessionAdmin)
admin.site.register(SavingsGoal, SavingsGoalAdmin)
