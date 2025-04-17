from django.utils import timezone
from django.contrib.auth import login, logout
from django.db.models import Sum, F, ExpressionWrapper, fields
from datetime import timedelta
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.utils.decorators import method_decorator

from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import action, permission_classes, authentication_classes, api_view
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

# JWT関連インポート
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Subject, StudySession, SavingsGoal
from .serializers import (
    UserSerializer,
    SubjectSerializer, 
    StudySessionSerializer, 
    SavingsGoalSerializer,
    RegisterSerializer
)

# AI分析サービスのインポート
from .ai_services import analyze_learning


# すべての認証関連ビューでCSRFを免除
@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer
    
    def create(self, request, *args, **kwargs):
        import logging
        logger = logging.getLogger('study_tracker')
        logger.info(f"Registration attempt with data: {request.data}")
        
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# JWTログインビュー
@method_decorator(csrf_exempt, name='dispatch')
class LoginJWTView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        import logging
        logger = logging.getLogger('study_tracker')
        
        from django.contrib.auth import authenticate
        username = request.data.get('username')
        password = request.data.get('password')
        
        # デバッグ情報追加
        logger.info(f"JWT login attempt for user: {username}")
        
        user = authenticate(username=username, password=password)
        
        if user:
            # ユーザー認証が成功した場合はJWTトークンを生成
            refresh = RefreshToken.for_user(user)
            
            # ログイン成功時の情報記録
            logger.info(f"JWT login successful for user: {username}")
            
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data,
                'message': 'JWTログインに成功しました。'
            })
        
        # ログイン失敗時の情報記録
        logger.error(f"JWT login failed for user: {username}")
        return Response({
            'message': 'ユーザー名またはパスワードが無効です。'
        }, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        import logging
        logger = logging.getLogger('study_tracker')
        
        from django.contrib.auth import authenticate
        username = request.data.get('username')
        password = request.data.get('password')
        
        # デバッグ情報追加
        logger.info(f"Login attempt for user: {username}")
        logger.info(f"Request headers: {dict(request.headers)}")
        logger.info(f"CSRF token in headers: {request.headers.get('X-CSRFToken', 'None')}")
        logger.info(f"Request cookies: {request.COOKIES}")
        
        user = authenticate(username=username, password=password)
        
        if user:
            login(request, user)
            # ログイン成功時の情報記録
            logger.info(f"Login successful for user: {username}")
            logger.info(f"Session key: {request.session.session_key}")
            logger.info(f"Session cookie age: {request.session.get_expiry_age()}")
            
            # レスポンスにセッション情報を含める
            response = Response({
                'user': UserSerializer(user).data,
                'message': 'ログインに成功しました。',
                'session_info': {
                    'session_key': request.session.session_key,
                    'expiry_age': request.session.get_expiry_age(),
                    'csrf_token': request.META.get('CSRF_COOKIE', '')
                }
            })
            return response
        
        # ログイン失敗時の情報記録
        logger.error(f"Login failed for user: {username}")
        return Response({
            'message': 'ユーザー名またはパスワードが無効です。'
        }, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class LogoutView(APIView):
    def post(self, request):
        import logging
        logger = logging.getLogger('study_tracker')
        
        # デバッグ情報追加
        if request.user.is_authenticated:
            logger.info(f"Logout attempt for user: {request.user.username}")
            session_key = request.session.session_key
            logger.info(f"Session before logout: {session_key}")
        else:
            logger.info("Logout attempt for unauthenticated user")
            
        # ログアウト処理
        logout(request)
        logger.info("User logged out successfully")
        
        return Response({'message': 'ログアウトしました。'})


@method_decorator(csrf_exempt, name='dispatch')
class UserView(APIView):
    permission_classes = [AllowAny]  # 開発中はAllowAnyに設定
    
    def get(self, request):
        if request.user.is_authenticated:
            serializer = UserSerializer(request.user)
            return Response(serializer.data)
        return Response({"detail": "認証されていません"}, status=status.HTTP_401_UNAUTHORIZED)
        
    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# すべてのViewSetとViewでCSRF免除を適用
@method_decorator(csrf_exempt, name='dispatch')
class SubjectViewSet(viewsets.ModelViewSet):
    serializer_class = SubjectSerializer
    permission_classes = [AllowAny]  # 開発中はAllowAnyに設定
    
    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Subject.objects.none()
        return Subject.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# セッションリクエストに関連する全てのViewSet
@method_decorator(csrf_exempt, name='dispatch')
class StudySessionViewSet(viewsets.ModelViewSet):
    serializer_class = StudySessionSerializer
    permission_classes = [AllowAny]  # 開発中はAllowAnyに設定
    
    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return StudySession.objects.none()
        return StudySession.objects.filter(user=self.request.user)
        
    def update(self, request, *args, **kwargs):
        # 部分更新をサポート
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def start(self, request):
        subject_id = request.data.get('subject')
        try:
            subject = Subject.objects.get(id=subject_id, user=request.user)
        except Subject.DoesNotExist:
            return Response({'error': '科目が見つかりません。'}, status=status.HTTP_404_NOT_FOUND)
            
        # 進行中のセッションがあるか確認
        active_session = StudySession.objects.filter(user=request.user, end_time=None).first()
        if active_session:
            return Response({'error': '既に進行中の勉強セッションがあります。'}, status=status.HTTP_400_BAD_REQUEST)
            
        session = StudySession.objects.create(
            user=request.user,
            subject=subject,
            start_time=timezone.now()
        )
        
        return Response(StudySessionSerializer(session).data)
    
    @action(detail=True, methods=['post'])
    def stop(self, request, pk=None):
        try:
            session = StudySession.objects.get(id=pk, user=request.user)
        except StudySession.DoesNotExist:
            return Response({'error': '勉強セッションが見つかりません。'}, status=status.HTTP_404_NOT_FOUND)
            
        if session.end_time:
            return Response({'error': 'このセッションは既に終了しています。'}, status=status.HTTP_400_BAD_REQUEST)
            
        end_time = timezone.now()
        session.end_time = end_time
        session.duration = end_time - session.start_time
        session.save()
        
        # 仮想貯金を計算して追加
        earned_amount = session.earned_amount
        
        # アクティブな貯金目標があれば、そこに加算
        active_goal = SavingsGoal.objects.filter(user=request.user, is_achieved=False).first()
        if active_goal:
            from decimal import Decimal
            active_goal.current_amount += Decimal(str(earned_amount))
            if active_goal.current_amount >= active_goal.target_amount:
                active_goal.is_achieved = True
            active_goal.save()
        
        return Response(StudySessionSerializer(session).data)
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        if not request.user.is_authenticated:
            return Response({'active': False})
        session = StudySession.objects.filter(user=request.user, end_time=None).first()
        if not session:
            return Response({'active': False})
        return Response({
            'active': True,
            'session': StudySessionSerializer(session).data
        })


# 貯金目標関連の全てのViewSet
@method_decorator(csrf_exempt, name='dispatch')
class SavingsGoalViewSet(viewsets.ModelViewSet):
    serializer_class = SavingsGoalSerializer
    permission_classes = [AllowAny]  # 開発中はAllowAnyに設定
    
    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return SavingsGoal.objects.none()
        return SavingsGoal.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@method_decorator(csrf_exempt, name='dispatch')
class StatsView(APIView):
    permission_classes = [AllowAny]  # 開発中はAllowAnyに設定
    
    def get(self, request):
        if not request.user.is_authenticated:
            return Response({
                'total_hours_week': 0,
                'total_hours_month': 0,
                'total_savings': 0,
                'subject_stats': []
            })
            
        # 今週の勉強時間
        now = timezone.now()
        week_start = now - timedelta(days=now.weekday())
        week_sessions = StudySession.objects.filter(
            user=request.user,
            end_time__isnull=False,
            start_time__gte=week_start
        )
        
        total_this_week = sum(
            [session.duration.total_seconds() / 3600 if session.duration else 0 for session in week_sessions]
        )
        
        # 今月の勉強時間
        month_start = now.replace(day=1)
        month_sessions = StudySession.objects.filter(
            user=request.user,
            end_time__isnull=False,
            start_time__gte=month_start
        )
        
        total_this_month = sum(
            [session.duration.total_seconds() / 3600 if session.duration else 0 for session in month_sessions]
        )
        
        # 総貯金額
        total_savings = sum(
            [session.earned_amount for session in StudySession.objects.filter(
                user=request.user, 
                end_time__isnull=False
            )]
        )
        
        # 科目ごとの勉強時間
        subject_stats = []
        for subject in Subject.objects.filter(user=request.user):
            subject_sessions = StudySession.objects.filter(
                user=request.user,
                subject=subject,
                end_time__isnull=False
            )
            
            total_hours = sum(
                [session.duration.total_seconds() / 3600 if session.duration else 0 for session in subject_sessions]
            )
            
            subject_stats.append({
                'id': subject.id,
                'name': subject.name,
                'total_hours': round(total_hours, 2),
                'total_earnings': sum([session.earned_amount for session in subject_sessions])
            })
        
        return Response({
            'total_hours_week': round(total_this_week, 2),
            'total_hours_month': round(total_this_month, 2),
            'total_savings': total_savings,
            'subject_stats': subject_stats
        })


# 学習分析用の新しいビュー
@method_decorator(csrf_exempt, name='dispatch')
@api_view(['POST'])
def analyze_learning_view(request):
    """学習状況を分析するAIエンドポイント"""
    if not request.user.is_authenticated:
        return Response({"error": "認証が必要です"}, status=status.HTTP_401_UNAUTHORIZED)
        
    try:
        # 学習目的を取得
        study_purpose = request.data.get('study_purpose', '')
        
        # 十分なデータがあるか確認
        session_count = StudySession.objects.filter(
            user=request.user,
            end_time__isnull=False
        ).count()
        
        if session_count < 3:
            return Response({
                "error": False,
                "analysis": "学習分析を行うには、少なくとも3つの完了した勉強セッションが必要です。もう少し勉強記録を増やしてから再度お試しください。"
            })
            
        # AI分析を実行
        analysis_result = analyze_learning(request.user, study_purpose)
        
        return Response({
            "error": False,
            "analysis": analysis_result
        })
            
    except Exception as e:
        import logging
        logger = logging.getLogger('study_tracker')
        logger.error(f"学習分析エラー: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        
        return Response({
            "error": True,
            "message": "分析中にエラーが発生しました。後でもう一度お試しください。"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
