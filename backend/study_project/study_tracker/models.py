from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Subject(models.Model):
    """勉強科目モデル"""
    name = models.CharField("科目名", max_length=100)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subjects')
    hourly_rate = models.DecimalField("時給換算額", max_digits=10, decimal_places=2, default=1000)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name


class StudySession(models.Model):
    """勉強セッションモデル"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='study_sessions')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='sessions')
    start_time = models.DateTimeField("開始時間", default=timezone.now)
    end_time = models.DateTimeField("終了時間", null=True, blank=True)
    duration = models.DurationField("勉強時間", null=True, blank=True)
    notes = models.TextField("メモ", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    @property
    def is_active(self):
        return self.end_time is None
        
    @property
    def earned_amount(self):
        """獲得金額を計算"""
        if not self.duration:
            return 0
            
        from decimal import Decimal
        hours = Decimal(str(self.duration.total_seconds() / 3600))
        return self.subject.hourly_rate * hours
    
    def __str__(self):
        return f"{self.subject.name} - {self.start_time.strftime('%Y-%m-%d %H:%M')}"


class SavingsGoal(models.Model):
    """貯金目標モデル"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='savings_goals')
    title = models.CharField("目標タイトル", max_length=200)
    target_amount = models.DecimalField("目標金額", max_digits=12, decimal_places=2)
    current_amount = models.DecimalField("現在の金額", max_digits=12, decimal_places=2, default=0)
    deadline = models.DateField("期限", null=True, blank=True)
    is_achieved = models.BooleanField("達成済み", default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    @property
    def progress_percentage(self):
        """進捗率を計算"""
        if float(self.target_amount) == 0:
            return 100
        return min(100, (float(self.current_amount) / float(self.target_amount)) * 100)
    
    def __str__(self):
        return self.title
