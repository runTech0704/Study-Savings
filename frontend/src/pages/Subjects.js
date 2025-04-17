import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Grid,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import API from '../services/api';

// バリデーションスキーマ
const validationSchema = yup.object({
  name: yup
    .string()
    .required('科目名を入力してください')
    .max(100, '科目名は100文字以内で入力してください'),
  hourly_rate: yup
    .number()
    .required('時給換算額を入力してください')
    .positive('0より大きい値を入力してください')
    .max(100000, '時給換算額は10万円以内で入力してください'),
});

function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // データ取得
  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await API.subjects.getAll();
      setSubjects(response.data);
    } catch (error) {
      console.error('科目取得エラー:', error);
      setError('科目データの読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchSubjects();
  }, []);
  
  // フォーム設定
  const formik = useFormik({
    initialValues: {
      name: '',
      hourly_rate: 1000,
    },
    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        if (selectedSubject) {
          // 更新
          await API.subjects.update(selectedSubject.id, values);
          setSnackbar({ open: true, message: '科目を更新しました', severity: 'success' });
        } else {
          // 新規作成
          await API.subjects.create(values);
          setSnackbar({ open: true, message: '新しい科目を作成しました', severity: 'success' });
        }
        resetForm();
        setOpenDialog(false);
        setSelectedSubject(null);
        fetchSubjects();
      } catch (error) {
        console.error('科目保存エラー:', error);
        setSnackbar({ open: true, message: '科目の保存に失敗しました', severity: 'error' });
      }
    },
  });
  
  // ダイアログを開く
  const handleOpenDialog = (subject = null) => {
    if (subject) {
      setSelectedSubject(subject);
      formik.setValues({
        name: subject.name,
        hourly_rate: subject.hourly_rate,
      });
    } else {
      setSelectedSubject(null);
      formik.resetForm();
    }
    setOpenDialog(true);
  };
  
  // ダイアログを閉じる
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedSubject(null);
    formik.resetForm();
  };
  
  // 削除ダイアログを開く
  const handleOpenDeleteDialog = (subject) => {
    setSelectedSubject(subject);
    setOpenDeleteDialog(true);
  };
  
  // 削除ダイアログを閉じる
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedSubject(null);
  };
  
  // 科目削除
  const handleDeleteSubject = async () => {
    try {
      await API.subjects.delete(selectedSubject.id);
      setSnackbar({ open: true, message: '科目を削除しました', severity: 'success' });
      setOpenDeleteDialog(false);
      setSelectedSubject(null);
      fetchSubjects();
    } catch (error) {
      console.error('科目削除エラー:', error);
      setSnackbar({ open: true, message: '科目の削除に失敗しました', severity: 'error' });
    }
  };
  
  // スナックバーを閉じる
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  if (loading && subjects.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold' }}>
          勉強科目
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          新しい科目
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {subjects.length === 0 ? (
        <Paper 
          elevation={0}
          sx={{ 
            p: 4, 
            borderRadius: 3,
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'medium' }}>
            まだ勉強科目がありません
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            「新しい科目」ボタンをクリックして、勉強する科目を追加しましょう。
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            新しい科目を追加
          </Button>
        </Paper>
      ) : (
        <TableContainer 
          component={Paper} 
          elevation={0}
          sx={{ 
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          }}
        >
          <Table>
            <TableHead sx={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
              <TableRow>
                <TableCell>科目名</TableCell>
                <TableCell align="right">時給換算額</TableCell>
                <TableCell align="right">作成日</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subjects.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell component="th" scope="row">
                    {subject.name}
                  </TableCell>
                  <TableCell align="right">¥{Math.round(subject.hourly_rate).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    {new Date(subject.created_at).toLocaleDateString('ja-JP')}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      size="small" 
                      color="primary" 
                      onClick={() => handleOpenDialog(subject)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => handleOpenDeleteDialog(subject)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* 科目作成・編集ダイアログ */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>
            {selectedSubject ? '科目を編集' : '新しい科目を追加'}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              margin="normal"
              id="name"
              name="name"
              label="科目名"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && formik.errors.name}
            />
            <TextField
              fullWidth
              margin="normal"
              id="hourly_rate"
              name="hourly_rate"
              label="時給換算額（円）"
              type="number"
              value={formik.values.hourly_rate}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.hourly_rate && Boolean(formik.errors.hourly_rate)}
              helperText={formik.touched.hourly_rate && formik.errors.hourly_rate}
              InputProps={{ startAdornment: '¥' }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              時給換算額は、勉強時間を仮想的な貯金に換算するための金額です。
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleCloseDialog}>キャンセル</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={!formik.isValid || formik.isSubmitting}
            >
              {selectedSubject ? '更新' : '作成'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      
      {/* 削除確認ダイアログ */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>科目を削除しますか？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            「{selectedSubject?.name}」を削除します。この操作は元に戻せません。
            関連する勉強記録は削除されませんが、この科目に紐づくデータは参照できなくなる可能性があります。
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDeleteDialog}>キャンセル</Button>
          <Button onClick={handleDeleteSubject} color="error">
            削除
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* スナックバー */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Subjects;
