import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TablePagination,
  Button,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Link
} from '@mui/material';
import { 
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useFormik } from 'formik';
import * as yup from 'yup';
import API from '../services/api';

// バリデーションスキーマ
const validationSchema = yup.object({
  notes: yup
    .string()
    .max(1000, 'メモは1000文字以内で入力してください'),
});

function StudySessions() {
  const [sessions, setSessions] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // セッションデータ取得
  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await API.sessions.getAll();
      setSessions(response.data);
    } catch (error) {
      console.error('セッション取得エラー:', error);
      setError('勉強記録の読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchSessions();
  }, []);
  
  // フォーム設定
  const formik = useFormik({
    initialValues: {
      notes: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      try {
        await API.sessions.update(selectedSession.id, values);
        setSnackbar({ open: true, message: 'メモを更新しました', severity: 'success' });
        setOpenDialog(false);
        fetchSessions();
      } catch (error) {
        console.error('セッション更新エラー:', error);
        setSnackbar({ open: true, message: 'メモの更新に失敗しました', severity: 'error' });
      }
    },
  });
  
  // 編集ダイアログを開く
  const handleOpenDialog = (session) => {
    setSelectedSession(session);
    formik.setValues({ notes: session.notes || '' });
    setOpenDialog(true);
  };
  
  // 編集ダイアログを閉じる
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedSession(null);
    formik.resetForm();
  };
  
  // 削除ダイアログを開く
  const handleOpenDeleteDialog = (session) => {
    setSelectedSession(session);
    setOpenDeleteDialog(true);
  };
  
  // 削除ダイアログを閉じる
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedSession(null);
  };
  
  // セッション削除
  const handleDeleteSession = async () => {
    try {
      await API.sessions.delete(selectedSession.id);
      setSnackbar({ open: true, message: '勉強記録を削除しました', severity: 'success' });
      setOpenDeleteDialog(false);
      fetchSessions();
    } catch (error) {
      console.error('セッション削除エラー:', error);
      setSnackbar({ open: true, message: '勉強記録の削除に失敗しました', severity: 'error' });
    }
  };
  
  // スナックバーを閉じる
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // ページ変更
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  // 1ページあたりの行数変更
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // 時間をフォーマット（00:00:00）
  const formatDuration = (durationStr) => {
    if (!durationStr) return '-';
    
    try {
      // ISO 8601の持続時間をパース
      const matches = durationStr.match(/P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      
      if (!matches) return durationStr;
      
      const days = parseInt(matches[1] || 0);
      const hours = parseInt(matches[2] || 0) + days * 24;
      const minutes = parseInt(matches[3] || 0);
      const seconds = parseInt(matches[4] || 0);
      
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } catch (error) {
      return durationStr;
    }
  };
  
  // 画面表示部分
  if (loading && sessions.length === 0) {
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
          勉強記録
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          component={RouterLink}
          to="/timer"
        >
          新しい勉強を開始
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {sessions.length === 0 ? (
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
            まだ勉強記録がありません
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            タイマーを使って勉強を記録しましょう。記録した勉強時間は時給に換算して貯金されます。
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            component={RouterLink}
            to="/timer"
          >
            勉強を開始する
          </Button>
        </Paper>
      ) : (
        <Paper 
          elevation={0}
          sx={{ 
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          }}
        >
          <TableContainer>
            <Table>
              <TableHead sx={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
                <TableRow>
                  <TableCell>科目</TableCell>
                  <TableCell>開始時間</TableCell>
                  <TableCell>終了時間</TableCell>
                  <TableCell>勉強時間</TableCell>
                  <TableCell align="right">貯金額</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((session) => (
                    <TableRow key={session.id}>
                      <TableCell component="th" scope="row">
                        {session.subject_name}
                        {session.is_active && (
                          <Chip 
                            label="進行中" 
                            color="primary" 
                            size="small" 
                            sx={{ ml: 1 }} 
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(session.start_time), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                      </TableCell>
                      <TableCell>
                        {session.end_time 
                          ? format(parseISO(session.end_time), 'yyyy年MM月dd日 HH:mm', { locale: ja }) 
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {session.duration ? formatDuration(session.duration) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {session.earned_amount 
                          ? `¥${Math.round(session.earned_amount).toLocaleString()}` 
                          : '-'
                        }
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          size="small" 
                          color="primary" 
                          onClick={() => handleOpenDialog(session)}
                          sx={{ mr: 1 }}
                          disabled={session.is_active}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleOpenDeleteDialog(session)}
                          disabled={session.is_active}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={sessions.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="表示件数:"
            labelDisplayedRows={({ from, to, count }) => 
              `${from}–${to} / ${count !== -1 ? count : `${to}以上`}`
            }
          />
        </Paper>
      )}
      
      {/* メモ編集ダイアログ */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>勉強メモを編集</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              multiline
              rows={4}
              margin="normal"
              id="notes"
              name="notes"
              label="勉強メモ"
              value={formik.values.notes}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.notes && Boolean(formik.errors.notes)}
              helperText={formik.touched.notes && formik.errors.notes}
              placeholder="学習内容や気づいたことなどをメモしておきましょう"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleCloseDialog}>キャンセル</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={!formik.isValid || formik.isSubmitting}
            >
              更新
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      
      {/* 削除確認ダイアログ */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>勉強記録を削除しますか？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            この勉強記録を削除します。この操作は元に戻せません。
            また、この記録に関連する貯金額も失われます。
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDeleteDialog}>キャンセル</Button>
          <Button onClick={handleDeleteSession} color="error">
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

export default StudySessions;
