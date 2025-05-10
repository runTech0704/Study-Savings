import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

// コンポーネントのインポート
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import GoogleCallback from './components/GoogleCallback';
import OAuthSuccess from './components/OAuthSuccess';
import Subjects from './pages/Subjects';
import StudySessions from './pages/StudySessions';
import SavingsGoals from './pages/SavingsGoals';
import StudyTimer from './pages/StudyTimer';
import LearningAnalysis from './pages/LearningAnalysis';

// コンテキストのインポート
import { AuthProvider } from './contexts/AuthContext';

// APIクライアントのインポート
import API from './services/api';

function App() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // URLクエリパラメータからトークンを取得する処理
  useEffect(() => {
    const checkURLForTokens = () => {
      const queryParams = new URLSearchParams(location.search);
      const accessToken = queryParams.get('access_token');
      const refreshToken = queryParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        console.log('URLからトークンを取得しました');
        
        // トークンをローカルストレージに保存
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        
        // 認証状態を更新
        setAuthenticated(true);
        
        // クエリパラメータを除去してリダイレクト
        navigate('/', { replace: true });
      }
    };
    
    checkURLForTokens();
  }, [location.search, navigate]);
  
  // JWTトークンが変更されたかをチェックするカスタムフック
  useEffect(() => {
    const tokenCheckInterval = setInterval(() => {
      const token = localStorage.getItem('access_token');
      if (token && !authenticated) {
        // トークンがあるのに認証状態がオフの場合は認証状態を更新
        console.log('トークンが見つかりましたが、認証状態がオフです。更新します。', token);
        setAuthenticated(true);
      } else if (!token && authenticated) {
        // トークンがないのに認証状態がオンの場合は認証状態を更新
        console.log('トークンがなくなりましたが、認証状態がオンです。更新します。');
        setAuthenticated(false);
      }
    }, 1000); // 1秒ごとにチェック
    
    return () => clearInterval(tokenCheckInterval);
  }, [authenticated]);
  
  // 認証状態チェック - JWT認証のみを使用
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // JWTトークンがあるかチェック
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
          try {
            // トークンの検証
            const userResponse = await API.auth.getUser();
            console.log('JWTトークン有効');
            setAuthenticated(true);
          } catch (tokenError) {
            console.log('JWTトークンの検証に失敗しました。リフレッシュを試みます', tokenError);
            try {
              // トークンのリフレッシュを試行
              const refreshResponse = await API.auth.refreshToken();
              console.log('トークンのリフレッシュに成功しました');
              setAuthenticated(true);

              // リフレッシュが成功した場合は、再度ユーザー情報を取得して確認
              try {
                await API.auth.getUser();
                console.log('ユーザー情報取得成功 - 認証有効です');
              } catch (userError) {
                console.error('ユーザー情報取得失敗', userError);
              }
            } catch (refreshError) {
              console.error('トークンのリフレッシュに失敗しました', refreshError);
              // 失敗した場合はトークンを削除して未認証状態に
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              setAuthenticated(false);
              // ログイン画面以外にいる場合はリダイレクト
              if (!location.pathname.startsWith('/login') && !location.pathname.startsWith('/register')) {
                navigate('/login');
              }
            }
          }
        } else {
          // トークンがない場合は、Google OAuthコールバックページまたはログイン/登録ページでない場合はログインページにリダイレクト
          if (location.pathname === '/google-callback' || location.pathname.startsWith('/login') || location.pathname.startsWith('/register')) {
            // 認証ページなのでそのまま
            setAuthenticated(false);
          } else {
            // 認証が必要なページなのでログインページにリダイレクト
            setAuthenticated(false);
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('認証状態チェックエラー:', error);
        setAuthenticated(false);
        // ログイン画面以外にいる場合はリダイレクト
        if (!location.pathname.startsWith('/login') && !location.pathname.startsWith('/register') && !location.pathname.startsWith('/google-callback')) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    
    // Google OAuth認証成功時のメッセージリスナー
    const handleMessage = (event) => {
      // 同じオリジンからのメッセージのみを処理
      if (event.origin === window.location.origin) {
        // Google認証成功メッセージ
        if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          console.log('Google認証成功メッセージを受信しました');
          setAuthenticated(true);
          // ダッシュボードに移動
          navigate('/');
        }
      }
    };
    
    // メッセージイベントのリスナーを追加
    window.addEventListener('message', handleMessage);
    
    // クリーンアップ
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [navigate, location.pathname]);

  // ログイン処理
  const login = () => {
    setAuthenticated(true);
  };

  // ログアウト処理
  const logout = async () => {
    try {
      // JWTログアウト処理の実行
      await API.auth.logout();
      
      // 認証状態を更新
      setAuthenticated(false);
      
      // ログイン画面に移動
      navigate('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
      
      // エラーが発生しても認証状態をリセットしてログイン画面に移動
      setAuthenticated(false);
      navigate('/login');
    }
  };

  // ロード中の表示
  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AuthProvider value={{ authenticated, login, logout }}>
      <Routes>
        <Route path="/login" element={authenticated ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={authenticated ? <Navigate to="/" /> : <Register />} />
        <Route path="/google-callback" element={<GoogleCallback />} />
        <Route path="/oauth-success" element={<OAuthSuccess />} />
        
        {/* 認証が必要なルート */}
        <Route element={<Layout />}>
          <Route path="/" element={authenticated ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/subjects" element={authenticated ? <Subjects /> : <Navigate to="/login" />} />
          <Route path="/sessions" element={authenticated ? <StudySessions /> : <Navigate to="/login" />} />
          <Route path="/goals" element={authenticated ? <SavingsGoals /> : <Navigate to="/login" />} />
          <Route path="/timer" element={authenticated ? <StudyTimer /> : <Navigate to="/login" />} />
          <Route path="/analysis" element={authenticated ? <LearningAnalysis /> : <Navigate to="/login" />} />
        </Route>
        
        {/* 存在しないパスへのリダイレクト */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
