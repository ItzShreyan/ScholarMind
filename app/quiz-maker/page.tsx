import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AI Quiz Maker | Generate Custom Quizzes Online | ScholarMind',
  description: 'Create personalized quizzes with AI-powered question generation. Transform your study materials into engaging quizzes for better learning and assessment.',
  keywords: 'quiz maker, quiz generator, AI quiz, custom quizzes, online testing',
  openGraph: {
    title: 'AI Quiz Maker for Effective Learning',
    description: 'Generate custom quizzes from your content with AI-powered question creation.',
    type: 'website',
  },
};

export default function QuizMakerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            AI Quiz Maker for Engaging Learning
          </h1>

          <p className="text-xl text-gray-600 mb-8">
            Generate comprehensive quizzes from your study materials with our advanced AI.
            Create multiple-choice, true/false, and short-answer questions that adapt to different
            learning levels and subjects.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2">AI Question Generation</h3>
              <p className="text-gray-600">
                Automatically create diverse question types from your content.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">📈</div>
              <h3 className="text-xl font-semibold mb-2">Adaptive Difficulty</h3>
              <p className="text-gray-600">
                Questions adjust to your knowledge level for optimal challenge.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Detailed Analytics</h3>
              <p className="text-gray-600">
                Track performance and identify areas needing improvement.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold mb-4">Quiz Types You Can Create</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Multiple Choice</h3>
                <p className="text-gray-600">Test knowledge with options including correct answers and distractors.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">True/False</h3>
                <p className="text-gray-600">Quick assessment questions for fundamental concepts.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Short Answer</h3>
                <p className="text-gray-600">Encourage deeper understanding with written responses.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Essay Questions</h3>
                <p className="text-gray-600">Comprehensive assessment for complex topics.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <h2 className="text-3xl font-bold mb-4">Start Creating Quizzes Today</h2>
            <p className="text-gray-600 mb-6">
              Transform your study materials into effective assessment tools with AI-powered quiz generation.
            </p>
            <Link
              href="/auth"
              className="inline-block bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Create Your First Quiz
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}