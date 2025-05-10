import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import API from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const GoogleCallback = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { authenticated, login, logout } = useAuth();

  useEffect(() => {
    const processGoogleCallback = async () => {
      try {
        console.log('Googleコールバックページが読み込まれました');
        console.log('URLパラメータ:', window.location.search);
        
        // URLからパラメータを取得してエラーがないかチェック
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('error')) {
          const errorMsg = urlParams.get('error_description') || urlParams.get('error') || 'Google認証中にエラーが発生しました';
          console.error('Google認証エラー:', errorMsg);
          setError(errorMsg);
          setLoading(false);
          return;
        }
        
        // 3秒待機してからAPI呼び出しを行う
        setTimeout(async () => {
          try {
            // Google OAuthからのコールバックを処理
            const result = await API.auth.handleGoogleCallback();
            
            if (result.success) {
              // 認証成功
              console.log('Google認証成功');
              // JWTトークンが設定されているか確認
              const token = localStorage.getItem('access_token');
              if (!token && result.token) {
                localStorage.setItem('access_token', result.token.access);
                localStorage.setItem('refresh_token', result.token.refresh);
                console.log('Google認証からJWTトークンを設定しました');
              }

              // 認証状態を更新
              if (login) {
                login();
              }
              
              // メイン画面にリダイレクト
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, window.location.origin);
                window.close(); // ポップアップを閉じる
              } else {
                // ポップアップではない場合はダッシュボードにリダイレクト
                navigate('/');
              }
            } else {
              // 認証失敗
              console.error('Google認証失敗:', result.error);
              setError(result.error || 'Google認証に失敗しました');
              setLoading(false);
            }
          } catch (apiError) {
            console.error('Google認証処理エラー:', apiError);
            setError('認証処理中にエラーが発生しました');
            setLoading(false);
          }
        }, 3000); // 3秒遅延
          
      } catch (error) {
        console.error('Google認証処理初期化エラー:', error);
        setError('認証処理の初期化中にエラーが発生しました');
        setLoading(false);
      }
    };

    processGoogleCallback();
  }, [login, navigate]);

  // ウィンドウが閉じない場合のフォールバック
  const handleManualClose = () => {
    window.close();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 3,
      }}
    >
      {loading ? (
        <>
          <CircularProgress size={50} sx={{ mb: 3 }} />
          <Typography variant="h6">Google認証を処理中...</Typography>
        </>
      ) : (
        <>
          {error && (
            <Alert severity="error" sx={{ mb: 3, width: '100%', maxWidth: '500px' }}>
              {error}
            </Alert>
          )}
          <Typography variant="body1" sx={{ mb: 3 }}>
            このウィンドウは自動的に閉じられます。閉じない場合は以下のボタンをクリックしてください。
          </Typography>
          <button
            onClick={handleManualClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            ウィンドウを閉じる
          </button>
        </>
      )}
    </Box>
  );
};

export default GoogleCallback;
