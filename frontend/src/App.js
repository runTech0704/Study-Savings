import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

// コンポーネントのインポート
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
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

  // 認証状態チェック
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        console.log('認証状態チェック開始');
        
        // JWTトークンがあるかまず確認
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
          try {
            console.log('JWT認証をチェックします');
            await API.auth.verifyToken();
            console.log('JWTトークン有効');
            setAuthenticated(true);
          } catch (tokenError) {
            console.log('JWTトークンの検証に失敗しました。リフレッシュを試みます');
            try {
              await API.auth.refreshToken();
              console.log('トークンのリフレッシュに成功しました');
              setAuthenticated(true);
            } catch (refreshError) {
              console.error('トークンのリフレッシュに失敗しました:', refreshError);
              // 失敗した場合はトークンを削除
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              setAuthenticated(false);
              // ログインページ以外にいる場合はリダイレクト
              if (!location.pathname.startsWith('/login') && !location.pathname.startsWith('/register')) {
                navigate('/login');
              }
            }
          }
        } else {
          // JWTがない場合は従来のセッション認証をチェック
          try {
            console.log('セッション認証をチェックします');
            // CSRFトークンを取得
            await API.auth.getCSRFToken();
            
            // 認証状態をチェック
            const response = await API.auth.checkAuth();
            console.log('認証状態チェック結果:', response.data);
            
            if (response.data.isAuthenticated) {
              setAuthenticated(true);
            } else {
              setAuthenticated(false);
              // ログインページ以外にいる場合はリダイレクト
              if (!location.pathname.startsWith('/login') && !location.pathname.startsWith('/register')) {
                navigate('/login');
              }
            }
          } catch (error) {
            console.error('セッション認証チェックエラー:', error);
            setAuthenticated(false);
            if (!location.pathname.startsWith('/login') && !location.pathname.startsWith('/register')) {
              navigate('/login');
            }
          }
        }
      } catch (error) {
        console.error('認証状態確認時のエラー:', error);
        setAuthenticated(false);
        // ログインページ以外にいる場合はリダイレクト
        if (!location.pathname.startsWith('/login') && !location.pathname.startsWith('/register')) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate, location.pathname]);

  // ログイン処理
  const login = () => {
    setAuthenticated(true);
  };

  // ログアウト処理
  const logout = async () => {
    try {
      // JWTログアウト
      if (localStorage.getItem('access_token')) {
        await API.auth.logoutJWT();
      } else {
        // 従来のセッションログアウト
        await API.auth.logout();
      }
      setAuthenticated(false);
      navigate('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

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
