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
            await API.auth.verifyToken();
            console.log('JWTトークン有効');
            setAuthenticated(true);
          } catch (tokenError) {
            console.log('JWTトークンの検証に失敗しました。リフレッシュを試みます');
            try {
              // トークンのリフレッシュを試行
              await API.auth.refreshToken();
              console.log('トークンのリフレッシュに成功しました');
              setAuthenticated(true);
            } catch (refreshError) {
              console.error('トークンのリフレッシュに失敗しました');
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
          // トークンがない場合は未認証状態
          setAuthenticated(false);
          // ログイン画面以外にいる場合はリダイレクト
          if (!location.pathname.startsWith('/login') && !location.pathname.startsWith('/register')) {
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('認証状態チェックエラー:', error);
        setAuthenticated(false);
        // ログイン画面以外にいる場合はリダイレクト
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
