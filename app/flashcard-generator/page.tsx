import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AI Flashcard Generator | Create Smart Study Cards | ScholarMind',
  description: 'Generate intelligent flashcards with AI-powered spaced repetition. Create, organize, and review flashcards that adapt to your learning style for better retention and academic success.',
  keywords: 'flashcard generator, spaced repetition, study cards, AI flashcards, memory retention',
  openGraph: {
    title: 'AI Flashcard Generator for Better Learning',
    description: 'Create smart flashcards that adapt to your learning pace with AI-powered algorithms.',
    type: 'website',
  },
};

export default function FlashcardGeneratorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            AI Flashcard Generator for Smarter Studying
          </h1>

          <p className="text-xl text-gray-600 mb-8">
            Transform your study materials into intelligent flashcards that adapt to your learning pace.
            Our AI-powered system uses spaced repetition algorithms to maximize memory retention and
            help you learn faster and more effectively.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">🧠</div>
              <h3 className="text-xl font-semibold mb-2">Smart Generation</h3>
              <p className="text-gray-600">
                AI analyzes your content and creates optimal flashcards automatically.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">⏰</div>
              <h3 className="text-xl font-semibold mb-2">Spaced Repetition</h3>
              <p className="text-gray-600">
                Review cards at optimal intervals for maximum memory retention.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Progress Tracking</h3>
              <p className="text-gray-600">
                Monitor your learning progress and identify areas for improvement.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold mb-4">How It Works</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">1</div>
                <div>
                  <h3 className="font-semibold">Upload Your Content</h3>
                  <p className="text-gray-600">Import notes, textbooks, or documents to generate flashcards from.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">2</div>
                <div>
                  <h3 className="font-semibold">AI Generation</h3>
                  <p className="text-gray-600">Our AI identifies key concepts and creates effective flashcards.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">3</div>
                <div>
                  <h3 className="font-semibold">Smart Review</h3>
                  <p className="text-gray-600">Review cards using spaced repetition for optimal learning.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <h2 className="text-3xl font-bold mb-4">Create Your First Flashcards</h2>
            <p className="text-gray-600 mb-6">
              Start generating intelligent flashcards in minutes. No more manual card creation!
            </p>
            <Link
              href="/auth"
              className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Generate Flashcards Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}