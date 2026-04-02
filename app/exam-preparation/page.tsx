import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Exam Preparation Tools | Ace Your Exams | ScholarMind',
  description: 'Comprehensive exam preparation tools with practice tests, study guides, and AI-powered revision. Prepare effectively for any exam with ScholarMind\'s proven strategies.',
  keywords: 'exam preparation, practice tests, study guides, exam tips, test preparation',
  openGraph: {
    title: 'Exam Preparation Tools for Academic Success',
    description: 'Practice tests, study guides, and AI-powered revision for exam success.',
    type: 'website',
  },
};

export default function ExamPreparationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Expert Exam Preparation Tools for Success
          </h1>

          <p className="text-xl text-gray-600 mb-8">
            Prepare for exams with confidence using our comprehensive suite of preparation tools.
            From practice tests and study guides to AI-powered revision strategies, we provide
            everything you need to ace your exams.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">📝</div>
              <h3 className="text-xl font-semibold mb-2">Practice Tests</h3>
              <p className="text-gray-600">
                Realistic exam simulations to build confidence and timing.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">📚</div>
              <h3 className="text-xl font-semibold mb-2">Study Guides</h3>
              <p className="text-gray-600">
                Comprehensive guides covering key topics and concepts.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2">Focus Areas</h3>
              <p className="text-gray-600">
                Identify and prioritize weak areas for targeted improvement.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold mb-4">Exam Preparation Strategies</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">1</div>
                <div>
                  <h3 className="font-semibold">Assess Your Knowledge</h3>
                  <p className="text-gray-600">Take diagnostic tests to understand your current level.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">2</div>
                <div>
                  <h3 className="font-semibold">Create a Study Plan</h3>
                  <p className="text-gray-600">Use our AI planner to create an effective revision schedule.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">3</div>
                <div>
                  <h3 className="font-semibold">Practice Regularly</h3>
                  <p className="text-gray-600">Regular practice tests to improve speed and accuracy.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">4</div>
                <div>
                  <h3 className="font-semibold">Review and Adjust</h3>
                  <p className="text-gray-600">Analyze performance and adjust your strategy accordingly.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <h2 className="text-3xl font-bold mb-4">Prepare for Exam Success</h2>
            <p className="text-gray-600 mb-6">
              Don&apos;t leave exam preparation to chance. Get the tools and strategies you need to succeed.
            </p>
            <Link
              href="/auth"
              className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              Start Exam Prep
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}