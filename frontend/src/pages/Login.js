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
  CircularProgress 
} from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useAuth } from '../contexts/AuthContext';
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
  
  // ページロード時の処理
  useEffect(() => {
    const checkAuthOnLoad = async () => {
      try {
        // 既存のJWTトークンで既に認証済みか確認
        const authResult = await API.auth.checkAuth();
        if (authResult.data.isAuthenticated) {
          console.log('既に認証済みです。ダッシュボードにリダイレクトします。');
          login(); // 既に認証されているなら状態を更新
        }
      } catch (error) {
        console.error('認証状態確認エラー:', error);
      }
    };
    
    checkAuthOnLoad();
  }, [login]);
  
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
          
          // 認証状態の更新
          login();
        } else {
          console.error('ログインレスポンスにトークンが含まれていません');
          setError('ログイン処理に問題が発生しました。再度お試しください。');
        }
      } catch (error) {
        console.error('ログインエラー:', error);
        setError(error.response?.data?.message || 'ログインに失敗しました。もう一度お試しください。');
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
