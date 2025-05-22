import vertexai
from vertexai.generative_models import GenerativeModel
from django.conf import settings
import logging
import os
import json
from datetime import datetime, timedelta
from django.utils import timezone

logger = logging.getLogger(__name__)

# Vertex AIの初期化
def initialize_vertex_ai():
    try:
        # 環境変数から値を取得するか、settings.pyから取得
        project_id = os.getenv('GCP_PROJECT_ID', getattr(settings, 'GCP_PROJECT_ID', None))
        location = os.getenv('GCP_REGION', getattr(settings, 'GCP_REGION', 'us-central1'))

        if not project_id:
            raise ValueError("GCP_PROJECT_IDが設定されていません")

        vertexai.init(
            project=project_id,
            location=location
        )
        logger.info("Vertex AI initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Vertex AI: {str(e)}")
        raise

# Geminiモデルのインスタンス取得
def get_gemini_model(model_name="gemini-2.0-flash"):
    try:
        initialize_vertex_ai()
        model = GenerativeModel(model_name)
        return model
    except Exception as e:
        logger.error(f"Failed to load Gemini model: {str(e)}")
        raise

# 汎用的なプロンプト送信関数
def generate_response(prompt, model_name="gemini-2.0-flash", temperature=0.2):
    try:
        model = get_gemini_model(model_name)
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.error(f"Error generating AI response: {str(e)}")
        return "AI分析を生成できませんでした。後でもう一度お試しください。"

# 学習分析のための関数
def analyze_learning(user, study_purpose):
    """
    ユーザーの学習目的と学習データに基づいて分析を行う
    """
    try:
        # 現在の日時
        now = timezone.now()

        # 今月の勉強時間を計算
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_sessions = user.study_sessions.filter(
            end_time__isnull=False,
            start_time__gte=month_start
        )

        total_month_hours = sum(
            [session.duration.total_seconds() / 3600 if session.duration else 0 for session in month_sessions]
        )

        # 今週の勉強時間を計算
        week_start = now - timedelta(days=now.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        week_sessions = user.study_sessions.filter(
            end_time__isnull=False,
            start_time__gte=week_start
        )

        total_week_hours = sum(
            [session.duration.total_seconds() / 3600 if session.duration else 0 for session in week_sessions]
        )

        # 30日以内の勉強セッションを取得
        thirty_days_ago = now - timedelta(days=30)
        recent_sessions = user.study_sessions.filter(
            end_time__isnull=False,
            start_time__gte=thirty_days_ago
        ).order_by('-start_time')

        # 科目ごとの勉強時間を集計
        subject_hours = {}
        for session in recent_sessions:
            subject_name = session.subject.name
            hours = session.duration.total_seconds() / 3600 if session.duration else 0

            if subject_name in subject_hours:
                subject_hours[subject_name] += hours
            else:
                subject_hours[subject_name] = hours

        # 最近のセッション情報を整形
        recent_sessions_data = []
        for session in recent_sessions[:15]:  # 最新15セッションまで
            session_data = {
                "date": session.start_time.strftime("%Y-%m-%d"),
                "subject": session.subject.name,
                "duration_hours": round(session.duration.total_seconds() / 3600, 2) if session.duration else 0,
                "notes": session.notes[:100] + "..." if session.notes and len(session.notes) > 100 else session.notes
            }
            recent_sessions_data.append(session_data)

        # 科目の時給換算額も取得
        subjects_data = []
        for subject in user.subjects.all():
            subjects_data.append({
                "name": subject.name,
                "hourly_rate": float(subject.hourly_rate)
            })

        # 貯金目標情報
        savings_goals = []
        for goal in user.savings_goals.all():
            goal_data = {
                "title": goal.title,
                "target_amount": float(goal.target_amount),
                "current_amount": float(goal.current_amount),
                "deadline": goal.deadline.strftime("%Y-%m-%d") if goal.deadline else "未設定",
                "is_achieved": goal.is_achieved,
                "progress_percentage": goal.progress_percentage
            }
            savings_goals.append(goal_data)

        # プロンプトを構築
        prompt = f"""
        あなたは学習コーチAIです。以下のデータを分析して、ユーザーの学習状況についてのインサイトと今後のアクションプランを提案してください。

        【学習の目的】
        {study_purpose}

        【学習データ】
        - 今月の合計勉強時間: {round(total_month_hours, 2)}時間
        - 今週の合計勉強時間: {round(total_week_hours, 2)}時間

        【科目別勉強時間（過去30日）】
        {json.dumps(subject_hours, ensure_ascii=False, indent=2)}

        【科目情報（時給換算額）】
        {json.dumps(subjects_data, ensure_ascii=False, indent=2)}

        【最近の学習セッション】
        {json.dumps(recent_sessions_data, ensure_ascii=False, indent=2)}

        【貯金目標情報】
        {json.dumps(savings_goals, ensure_ascii=False, indent=2)}

        学習状況を分析して、以下の点についてのインサイトと今後のアクションを提案してください：
        1. 学習パターンの分析（いつ、どのように勉強しているか）
        2. 学習効率の評価と改善点
        3. 目標達成に向けた具体的なネクストアクション
        4. モチベーション維持のためのアドバイス
        5. 学習目的に照らした進捗評価

        回答は日本語で、友好的かつ励ましの要素を含め、具体的なアドバイスを提供してください。
        箇条書きやリストを適切に使用して読みやすくしてください。
        """

        # AIモデルからレスポンスを取得
        response = generate_response(prompt)
        return response

    except Exception as e:
        logger.error(f"Error analyzing learning data: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return "学習データの分析中にエラーが発生しました。後でもう一度お試しください。"
