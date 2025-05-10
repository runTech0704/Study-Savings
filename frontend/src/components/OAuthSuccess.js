import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

// URLのクエリパラメータを解析する関数
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const query = useQuery();
  
  // URLからトークンを取得
  const accessToken = query.get('access_token');
  const refreshToken = query.get('refresh_token');
  
  useEffect(() => {
    // トークンがURLに含まれているか確認
    if (accessToken && refreshToken) {
      console.log('トークンを取得しました。認証処理を行います...');
      
      // トークンをローカルストレージに保存
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      
      // 認証状態を更新
      login();
      
      // ダッシュボードにリダイレクト
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } else {
      // トークンがない場合はログインページにリダイレクト
      console.error('認証トークンが見つかりませんでした');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    }
  }, [accessToken, refreshToken, login, navigate]);
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 3,
      }}
    >
      <CircularProgress size={60} sx={{ mb: 4 }} />
      <Typography variant="h5" gutterBottom>
        認証処理中...
      </Typography>
      <Typography variant="body1" color="text.secondary" align="center">
        {accessToken && refreshToken
          ? 'Google認証が成功しました。ダッシュボードにリダイレクトします。'
          : '認証情報が見つかりません。ログイン画面に戻ります。'
        }
      </Typography>
    </Box>
  );
};

export default OAuthSuccess;
