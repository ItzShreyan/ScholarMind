import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Best Online Study Tools for Students | ScholarMind',
  description: 'Discover powerful online study tools including flashcards, quizzes, and AI-powered learning assistants. Boost your academic performance with ScholarMind\'s comprehensive study platform.',
  keywords: 'online study tools, student tools, learning platform, academic success',
  openGraph: {
    title: 'Best Online Study Tools for Students',
    description: 'Transform your study habits with AI-powered tools designed for academic excellence.',
    type: 'website',
  },
};

export default function StudyToolsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Best Online Study Tools for Academic Success
          </h1>

          <p className="text-xl text-gray-600 mb-8">
            Transform your learning experience with our comprehensive suite of AI-powered study tools.
            From intelligent flashcards to personalized quiz generators, ScholarMind provides everything
            you need to excel in your studies.
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold mb-4">Smart Flashcards</h2>
              <p className="text-gray-600 mb-4">
                Create and review flashcards with spaced repetition algorithms that adapt to your learning pace.
              </p>
              <Link href="/flashcard-generator" className="text-blue-600 hover:text-blue-800 font-medium">
                Learn more →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold mb-4">AI Quiz Generator</h2>
              <p className="text-gray-600 mb-4">
                Generate custom quizzes from your study materials with AI-powered question creation.
              </p>
              <Link href="/quiz-maker" className="text-blue-600 hover:text-blue-800 font-medium">
                Learn more →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold mb-4">Revision Planner</h2>
              <p className="text-gray-600 mb-4">
                Plan your study sessions effectively with personalized revision schedules and progress tracking.
              </p>
              <Link href="/revision-planner" className="text-blue-600 hover:text-blue-800 font-medium">
                Learn more →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold mb-4">AI Study Assistant</h2>
              <p className="text-gray-600 mb-4">
                Get instant help with complex topics, explanations, and study guidance from our AI assistant.
              </p>
              <Link href="/ai-study-assistant" className="text-blue-600 hover:text-blue-800 font-medium">
                Learn more →
              </Link>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Boost Your Grades?</h2>
            <p className="text-gray-600 mb-6">
              Join thousands of students who have improved their academic performance with ScholarMind.
            </p>
            <Link
              href="/auth"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Start Studying Smarter Today
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}