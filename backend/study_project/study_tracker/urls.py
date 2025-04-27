from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from . import views

# APIルーターの設定
router = DefaultRouter()
router.register(r'subjects', views.SubjectViewSet, basename='subject')
router.register(r'sessions', views.StudySessionViewSet, basename='study-session')
router.register(r'goals', views.SavingsGoalViewSet, basename='savings-goal')

# JWT認証チェック用のエンドポイント - JWTトークンの有効性に基づいて認証状態を返す
def check_auth_jwt(request):
    """
    JWTトークンがヘッダーにある場合、DRFのAuthentication Classesによって
    自動的に認証されているため、リクエストユーザーの認証状態に基づいて
    JSONレスポンスを返すだけでよい
    """
    from django.http import JsonResponse
    
    if request.user.is_authenticated:
        return JsonResponse({
            "isAuthenticated": True, 
            "username": request.user.username,
            "authType": "jwt"
        })
    return JsonResponse({
        "isAuthenticated": False,
        "authType": "none"
    })

urlpatterns = [
    path('', include(router.urls)),
    
    # JWT認証用エンドポイント
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # ユーザー認証関連のエンドポイント
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/check/', check_auth_jwt, name='check-auth'),
    
    # ユーザー情報
    path('user/', views.UserView.as_view(), name='user'),
    
    # 統計と分析
    path('stats/', views.StatsView.as_view(), name='stats'),
    path('analyze-learning/', views.analyze_learning_view, name='analyze-learning'),
]
