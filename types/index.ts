export type AIAction =
  | "summary"
  | "flashcards"
  | "quiz"
  | "chat"
  | "exam"
  | "concepts"
  | "eli10"
  | "hard_mode"
  | "study_plan"
  | "insights";

export type AIRequest = {
  action: AIAction;
  prompt: string;
  context?: string;
  sessionId?: string;
  userId?: string;
};

export type StudySession = {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
};

export type StudyFile = {
  id: string;
  session_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  extracted_text: string;
  created_at: string;
};
