from rest_framework import serializers
from django.utils import timezone
from django.contrib.auth.models import User
from .models import Subject, StudySession, SavingsGoal


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name', 'hourly_rate', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class StudySessionSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    earned_amount = serializers.FloatField(read_only=True)
    
    class Meta:
        model = StudySession
        fields = ['id', 'subject', 'subject_name', 'start_time', 'end_time', 'duration', 'notes', 'earned_amount', 'is_active', 'created_at']
        read_only_fields = ['id', 'duration', 'earned_amount', 'is_active', 'created_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # 勉強セッションが終了する場合、durationを計算
        if 'end_time' in validated_data and validated_data['end_time'] and not instance.end_time:
            start = instance.start_time
            end = validated_data['end_time']
            validated_data['duration'] = end - start
            
        return super().update(instance, validated_data)
        
    def partial_update(self, instance, validated_data):
        # 部分更新の場合、subjectフィールドが必須でないようにする
        return self.update(instance, validated_data)


class SavingsGoalSerializer(serializers.ModelSerializer):
    progress_percentage = serializers.FloatField(read_only=True)
    
    class Meta:
        model = SavingsGoal
        fields = ['id', 'title', 'target_amount', 'current_amount', 'deadline', 'is_achieved', 'progress_percentage', 'created_at']
        read_only_fields = ['id', 'progress_percentage', 'created_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, style={'input_type': 'password'}, label="Confirm password")
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name']
        
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "パスワードが一致しません。"})
        
        # ユーザー名とメールアドレスの重複チェック
        username = attrs.get('username', '')
        email = attrs.get('email', '')
        
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError({"username": "このユーザー名は既に使用されています。"})
            
        if email and User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "このメールアドレスは既に使用されています。"})
            
        return attrs
        
    def create(self, validated_data):
        import logging
        logger = logging.getLogger('study_tracker')
        logger.info(f"Creating user with data: {validated_data}")
        
        try:
            # password2を削除
            validated_data.pop('password2', None)
            
            # 必要な値があるか確認
            if 'username' not in validated_data or not validated_data['username']:
                raise serializers.ValidationError({"username": "ユーザー名は必須です。"})
                
            if 'password' not in validated_data or not validated_data['password']:
                raise serializers.ValidationError({"password": "パスワードは必須です。"})
            
            # ユーザー作成
            password = validated_data.pop('password')
            user = User.objects.create(
                username=validated_data.get('username'),
                email=validated_data.get('email', ''),
                first_name=validated_data.get('first_name', ''),
                last_name=validated_data.get('last_name', '')
            )
            
            # パスワード設定
            user.set_password(password)
            user.save()
            
            logger.info(f"User created successfully: {user.username}")
            return user
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            raise
