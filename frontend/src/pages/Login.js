import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Link, 
  Divider, 
  Alert,
  CircularProgress,
  Snackbar 
} from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useAuth, startGoogleOAuth } from '../contexts/AuthContext';
import API from '../services/api';

// バリデーションスキーマ
const validationSchema = yup.object({
  username: yup
    .string()
    .required('ユーザー名を入力してください'),
  password: yup
    .string()
    .required('パスワードを入力してください'),
});

function Login() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // ページロード時の処理
  useEffect(() => {
    const checkAuthOnLoad = async () => {
      // JWTトークンが存在するかチェック
      const accessToken = localStorage.getItem('access_token');
      if (accessToken) {
        try {
          // トークンの検証を試行
          await API.auth.verifyToken();
          console.log('JWTトークンが有効です。ダッシュボードにリダイレクトします。');
          login();
        } catch (tokenError) {
          console.warn('トークンが無効です。リフレッシュを試みます', tokenError);
          try {
            // トークンのリフレッシュを試行
            await API.auth.refreshToken();
            console.log('トークンのリフレッシュに成功しました');
            login();
          } catch (refreshError) {
            console.error('トークンのリフレッシュに失敗しました', refreshError);
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        }
      } else {
        // トークンがない場合は未認証状態
        console.log('JWTトークンがありません');
      }
    };
    
    checkAuthOnLoad();
  }, [login]);
  
  // Google OAuth認証を開始する関数
  const handleGoogleLogin = () => {
    try {
      // Google OAuth認証を開始
      const result = startGoogleOAuth();
      
      if (!result) {
        setSnackbarMessage('Google認証の開始に失敗しました。ポップアップがブロックされていないか確認してください。');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Google認証エラー:', error);
      setSnackbarMessage('Google認証中にエラーが発生しました。後でもう一度お試しください。');
      setSnackbarOpen(true);
    }
  };
  
  // Snackbarを閉じる関数
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  
  const formik = useFormik({
    initialValues: {
      username: '',
      password: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      setError('');
      
      try {
        // ログイン処理の実行
        const response = await API.auth.login(values);
        
        if (response.data.access && response.data.refresh) {
          console.log('ログイン成功');
          
          // JWTトークンをローカルストレージに保存
          localStorage.setItem('access_token', response.data.access);
          localStorage.setItem('refresh_token', response.data.refresh);
          console.log('トークンが保存されました:', localStorage.getItem('access_token'));
          
          // 認証状態の更新
          login();
        } else {
          console.error('ログインレスポンスにトークンが含まれていません');
          setError('ログイン処理に問題が発生しました。再度お試しください。');
        }
      } catch (error) {
        console.error('ログインエラー:', error);
        
        // レート制限エラー（429）の場合は特別なメッセージを表示
        if (error.response && error.response.status === 429) {
          const retryAfter = error.response.data.retry_after || 60;
          setError(`リクエストが多すぎます。${retryAfter}秒後に再度お試しください。`);
        } else {
          setError(error.response?.data?.message || 'ログインに失敗しました。もう一度お試しください。');
        }
      } finally {
        setLoading(false);
      }
    },
  });
  
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '100vh',
          pt: 8,
        }}
      >
        <Typography component="h1" variant="h4" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
          StudySavings
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
          勉強時間を記録して仮想的にお金を貯めよう
        </Typography>
        
        <Paper
          elevation={0}
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Typography component="h2" variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
            ログイン
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <form onSubmit={formik.handleSubmit}>
            <TextField
              fullWidth
              id="username"
              name="username"
              label="ユーザー名"
              margin="normal"
              value={formik.values.username}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.username && Boolean(formik.errors.username)}
              helperText={formik.touched.username && formik.errors.username}
            />
            <TextField
              fullWidth
              id="password"
              name="password"
              label="パスワード"
              type="password"
              margin="normal"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              {loading ? <CircularProgress size={24} /> : 'ログイン'}
            </Button>
          </form>
          
          <Divider sx={{ my: 3 }} />
          
          {/* Googleログインボタン */}
          <Button
            fullWidth
            variant="outlined"
            onClick={handleGoogleLogin}
            disabled={loading}
            sx={{
              mt: 1,
              mb: 2,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #e0e0e0',
              color: 'rgba(0, 0, 0, 0.87)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : (
              <img
                src="/logo192.png"
                alt="App Logo"
                style={{ width: '24px', height: '24px', marginRight: '8px' }}
              />
            )}
            Googleでログイン
          </Button>
          
          {/* エラー通知用Snackbar */}
          <Snackbar
            open={snackbarOpen}
            autoHideDuration={6000}
            onClose={handleSnackbarClose}
            message={snackbarMessage}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          />
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              アカウントをお持ちでない方は{' '}
              <Link component={RouterLink} to="/register" underline="hover">
                新規登録
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Login;
