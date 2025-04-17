from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from . import views

router = DefaultRouter()
router.register(r'subjects', views.SubjectViewSet, basename='subject')
router.register(r'sessions', views.StudySessionViewSet, basename='study-session')
router.register(r'goals', views.SavingsGoalViewSet, basename='savings-goal')

# CSRFトークンを取得するためのビュー
@ensure_csrf_cookie
def get_csrf_token(request):
    # デバッグ情報追加
    import logging
    logger = logging.getLogger('study_tracker')
    
    # CSRFトークンをCookieに設定し、レスポンスにも含める
    csrf_token = request.META.get("CSRF_COOKIE", "")
    logger.info(f"get_csrf_token: Setting CSRF token: {csrf_token}")
    logger.info(f"get_csrf_token: Request headers: {dict(request.headers)}")
    
    response = JsonResponse({
        "detail": "CSRF cookie set",
        "token_length": len(csrf_token) if csrf_token else 0,
        "user_agent": request.META.get('HTTP_USER_AGENT', 'Unknown')
    })
    response["X-CSRFToken"] = csrf_token
    logger.info(f"get_csrf_token: Response headers: {dict(response.headers)}")
    
    return response

# 認証状態をチェックするビュー
def check_auth(request):
    # デバッグ情報追加
    import logging
    logger = logging.getLogger('study_tracker')
    cookies = request.COOKIES
    logger.info(f"check_auth: Cookies received: {cookies}")
    logger.info(f"check_auth: User is authenticated: {request.user.is_authenticated}")
    
    if request.user.is_authenticated:
        return JsonResponse({
            "isAuthenticated": True, 
            "username": request.user.username,
            "cookies": {k: v for k, v in cookies.items() if k != 'sessionid'}
        })
    return JsonResponse({
        "isAuthenticated": False,
        "cookies": {k: v for k, v in cookies.items() if k != 'sessionid'}
    })

urlpatterns = [
    path('', include(router.urls)),
    
    # JWT認証用エンドポイント
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # 役割を明確にするためにエンドポイント名を変更
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login-jwt/', views.LoginJWTView.as_view(), name='login-jwt'),  # JWTログイン
    path('auth/login/', views.LoginView.as_view(), name='login'),  # 既存のセッションログイン
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/csrf/', ensure_csrf_cookie(get_csrf_token), name='csrf-token'),
    path('auth/check/', check_auth, name='check-auth'),
    path('user/', views.UserView.as_view(), name='user'),
    path('stats/', views.StatsView.as_view(), name='stats'),
    
    # 学習分析用のエンドポイント
    path('analyze-learning/', views.analyze_learning_view, name='analyze-learning'),
    
    # REST framework認証用URL
    path('api-auth/', include('rest_framework.urls')),
]
