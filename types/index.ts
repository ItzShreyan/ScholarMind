export type AIAction =
  | "summary"
  | "flashcards"
  | "quiz"
  | "chat"
  | "exam"
  | "concepts"
  | "hard_mode"
  | "study_plan"
  | "insights";

export type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type AIRequest = {
  action: AIAction;
  prompt: string;
  message?: string;
  history?: ChatHistoryItem[];
  mode?: AIAction | string;
  content?: string;
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
  source_enabled?: boolean;
  created_at: string;
};
