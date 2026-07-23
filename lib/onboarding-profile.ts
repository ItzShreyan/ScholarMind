export type OnboardingRecord = {
  user_id: string;
  discovery_source: string[];
  education_level: string;
  country: string;
  curriculum_stage: string;
  state_region: string;
  subjects: string[];
  exam_boards: Record<string, string>;
  subject_tiers: Record<string, string>;
  university_subject: string;
  learning_style: string[];
  goal: string;
  completed_at: string | null;
};

export function onboardingSummary(record?: Partial<OnboardingRecord> | null) {
  if (!record) return "";

  return [
    record.education_level ? `Education level: ${record.education_level}` : "",
    record.country ? `Country: ${record.country}` : "",
    record.curriculum_stage ? `Curriculum/stage: ${record.curriculum_stage}` : "",
    record.exam_boards && Object.keys(record.exam_boards).length
      ? `Exam boards: ${Object.entries(record.exam_boards)
          .map(([subject, board]) => `${subject}: ${board}`)
          .join(", ")}`
      : "",
    record.subject_tiers && Object.keys(record.subject_tiers).length
      ? `Tiers: ${Object.entries(record.subject_tiers)
          .map(([subject, tier]) => `${subject}: ${tier}`)
          .join(", ")}`
      : "",
    record.subjects?.length ? `Subjects: ${record.subjects.join(", ")}` : "",
    record.university_subject ? `University subject: ${record.university_subject}` : "",
    record.learning_style?.length ? `Preferred style: ${record.learning_style.join(", ")}` : "",
    record.goal ? `Goal: ${record.goal}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}
