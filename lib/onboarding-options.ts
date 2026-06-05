export const onboardingOptions = {
  discovery: ["TikTok", "Google", "Friend", "Teacher", "Reddit", "YouTube", "Other"],
  levels: ["GCSE / High school", "A-Level / Sixth form", "University", "Adult learner", "Other"],
  countries: ["United Kingdom", "United States", "India", "Canada", "Australia", "Other"],
  stages: ["GCSE", "A-Level", "IB", "SAT / AP", "University course", "Other"],
  examBoards: {
    "United Kingdom": {
      GCSE: ["AQA", "Edexcel", "OCR", "WJEC / Eduqas", "CCEA", "SQA"],
      "A-Level": ["AQA", "Edexcel", "OCR", "WJEC / Eduqas", "CCEA", "SQA"]
    },
    "United States": {
      "SAT / AP": ["College Board AP", "SAT", "ACT", "State curriculum"]
    },
    India: {
      Other: ["CBSE", "ICSE", "State Board", "Cambridge International"]
    },
    Canada: {
      Other: ["Provincial curriculum", "IB", "AP"]
    },
    Australia: {
      Other: ["State curriculum", "VCE", "HSC", "QCE", "WACE", "SACE", "TASC", "IB"]
    }
  } as Record<string, Record<string, string[]>>,
  tieredSubjects: ["Maths", "Biology", "Chemistry", "Physics", "Computer Science"],
  subjects: [
    "Biology",
    "Chemistry",
    "Physics",
    "Maths",
    "English",
    "History",
    "Geography",
    "Computer Science",
    "Economics",
    "Languages"
  ],
  learningStyles: ["Step-by-step", "Visual diagrams", "Practice questions", "Flashcards", "Short summaries", "Exam mode"],
  goals: [
    "Understand lessons faster",
    "Prepare for exams",
    "Catch up on missed work",
    "Make revision less stressful",
    "Build daily study habits"
  ]
};
