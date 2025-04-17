import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Divider,
  Avatar,
  Fade,
  Chip,
  useTheme
} from '@mui/material';
import { 
  Psychology as PsychologyIcon,
  Send as SendIcon,
  Lightbulb as LightbulbIcon,
  Timeline as TimelineIcon,
  EmojiObjects as EmojiObjectsIcon
} from '@mui/icons-material';
import API from '../services/api';
import ReactMarkdown from 'react-markdown';

function LearningAnalysis() {
  const theme = useTheme();
  const [studyPurpose, setStudyPurpose] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSessionData, setHasSessionData] = useState(true);
  const [statsData, setStatsData] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  
  const analysisRef = useRef(null);
  
  // 統計データを取得
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await API.stats.get();
        setStatsData(response.data);
        
        // 統計データをチェックして、十分な学習セッションがあるか確認
        const hasEnoughData = response.data.subject_stats.some(subject => subject.total_hours > 0);
        setHasSessionData(hasEnoughData);
      } catch (error) {
        console.error('統計データの取得に失敗しました:', error);
      }
    };
    
    fetchStats();
  }, []);
  
  // 入力フィールド変更ハンドラ
  const handleStudyPurposeChange = (e) => {
    setStudyPurpose(e.target.value);
  };
  
  // 学習分析実行
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!studyPurpose.trim()) {
      setError('学習目的を入力してください');
      return;
    }
    
    setError('');
    setLoading(true);
    setSubmitted(true);
    
    try {
      const response = await API.analysis.getLearningAnalysis(studyPurpose);
      setAnalysis(response.data.analysis);
      
      // 分析結果にスクロール
      setTimeout(() => {
        if (analysisRef.current) {
          analysisRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
    } catch (error) {
      console.error('学習分析エラー:', error);
      setError('分析の実行中にエラーが発生しました。後でもう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box sx={{ pb: 6 }}>
      {/* ヘッダーセクション */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 4, 
          mb: 4, 
          borderRadius: 3,
          backgroundColor: 'primary.light',
          color: 'primary.contrastText',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ 
          position: 'absolute', 
          top: -20, 
          right: -20, 
          fontSize: 160, 
          opacity: 0.1 
        }}>
          <PsychologyIcon fontSize="inherit" />
        </Box>
        
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 2, position: 'relative', zIndex: 1 }}>
          学習分析
        </Typography>
        
        <Typography variant="body1" sx={{ maxWidth: 800, position: 'relative', zIndex: 1 }}>
          AIを活用した学習パターンの分析と最適な学習戦略の提案を受けることができます。
          あなたの勉強時間データをもとに、効率的な学習方法や改善点を見つけましょう。
        </Typography>
      </Paper>
      
      {/* 学習目的入力セクション */}
      <Paper
        elevation={0}
        sx={{ 
          p: 4, 
          mb: 4, 
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        }}
      >
        <Typography variant="h6" component="h2" sx={{ mb: 3, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
          <LightbulbIcon sx={{ mr: 1, color: 'primary.main' }} />
          学習目的を教えてください
        </Typography>
        
        {!hasSessionData && (
          <Alert severity="info" sx={{ mb: 3 }}>
            学習分析を行うには、少なくとも1つの勉強セッションが必要です。まずはタイマーで勉強を記録しましょう！
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="何のために勉強していますか？"
            value={studyPurpose}
            onChange={handleStudyPurposeChange}
            placeholder="例: プログラミングスキルを向上させて転職したい / 大学入試に向けて数学の点数を上げたい / 英検1級に合格するため など"
            variant="outlined"
            sx={{ mb: 3 }}
            disabled={loading || !hasSessionData}
            required
          />
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            disabled={loading || !studyPurpose.trim() || !hasSessionData}
            sx={{ 
              py: 1.5,
              px: 4,
              borderRadius: 2,
            }}
          >
            {loading ? '分析中...' : '分析する'}
          </Button>
        </form>
      </Paper>
      
      {/* 現在の学習状況サマリー */}
      {statsData && (
        <Paper
          elevation={0}
          sx={{ 
            p: 4, 
            mb: 4, 
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          }}
        >
          <Typography variant="h6" component="h2" sx={{ mb: 3, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <TimelineIcon sx={{ mr: 1, color: 'primary.main' }} />
            現在の学習状況
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Card elevation={0} sx={{ height: '100%', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    今月の勉強時間
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', my: 1 }}>
                    {statsData.total_hours_month}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    時間
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Card elevation={0} sx={{ height: '100%', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    今週の勉強時間
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', my: 1 }}>
                    {statsData.total_hours_week}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    時間
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Card elevation={0} sx={{ height: '100%', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    勉強した科目数
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', my: 1 }}>
                    {statsData.subject_stats.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    科目
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
              勉強している科目:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {statsData.subject_stats.map((subject) => (
                <Chip 
                  key={subject.id}
                  label={`${subject.name} (${subject.total_hours}時間)`}
                  variant="outlined"
                  color="primary"
                />
              ))}
            </Box>
          </Box>
        </Paper>
      )}
      
      {/* 分析結果表示セクション */}
      {submitted && (
        <div ref={analysisRef}>
          <Fade in={!loading && analysis !== ''} timeout={1000}>
            <Paper
              elevation={0}
              sx={{ 
                p: 0, 
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                overflow: 'hidden',
              }}
            >
              {/* AIアシスタントヘッダー */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 2,
                  backgroundColor: theme.palette.grey[50],
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: 'primary.main',
                    width: 40,
                    height: 40,
                    mr: 2,
                  }}
                >
                  <EmojiObjectsIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    学習コーチAI
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    あなたの学習データを分析しました
                  </Typography>
                </Box>
              </Box>
              
              {/* 分析結果コンテンツ */}
              <Box sx={{ p: 3 }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Box sx={{ 
                    '& p': { mb: 2 },
                    '& ul, & ol': { mb: 2, pl: 3 },
                    '& li': { mb: 1 },
                    '& h3': { fontWeight: 'bold', mt: 3, mb: 2 },
                  }}>
                    <ReactMarkdown>
                      {analysis}
                    </ReactMarkdown>
                  </Box>
                )}
              </Box>
            </Paper>
          </Fade>
          
          {loading && (
            <Paper
              elevation={0}
              sx={{ 
                p: 4, 
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                textAlign: 'center',
              }}
            >
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                学習データを分析しています...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                あなたの学習パターンと目標に合わせた分析結果を生成中です。
                <br />
                少々お待ちください。
              </Typography>
            </Paper>
          )}
        </div>
      )}
    </Box>
  );
}

export default LearningAnalysis;
