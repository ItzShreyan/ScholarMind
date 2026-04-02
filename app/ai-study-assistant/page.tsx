import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AI Study Assistant | 24/7 Learning Support | ScholarMind',
  description: 'Get instant help with homework, explanations, and study guidance from our advanced AI study assistant. Available 24/7 for personalized learning support.',
  keywords: 'AI study assistant, homework help, learning AI, study support, academic assistant',
  openGraph: {
    title: 'AI Study Assistant for Round-the-Clock Learning',
    description: 'Get personalized study help and explanations anytime with our AI assistant.',
    type: 'website',
  },
};

export default function AIStudyAssistantPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            AI Study Assistant for 24/7 Learning Support
          </h1>

          <p className="text-xl text-gray-600 mb-8">
            Never study alone again. Our advanced AI study assistant provides instant explanations,
            homework help, and personalized guidance whenever you need it. Available round-the-clock
            to support your learning journey.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">💡</div>
              <h3 className="text-xl font-semibold mb-2">Instant Explanations</h3>
              <p className="text-gray-600">
                Get clear explanations for complex topics in seconds.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">📚</div>
              <h3 className="text-xl font-semibold mb-2">Homework Help</h3>
              <p className="text-gray-600">
                Step-by-step solutions and guidance for assignments.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2">Personalized Learning</h3>
              <p className="text-gray-600">
                Adapts to your learning style and knowledge level.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold mb-4">How Our AI Assistant Helps You Learn</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-indigo-100 text-indigo-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">1</div>
                <div>
                  <h3 className="font-semibold">Concept Clarification</h3>
                  <p className="text-gray-600">Break down difficult concepts into understandable explanations.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-indigo-100 text-indigo-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">2</div>
                <div>
                  <h3 className="font-semibold">Problem Solving</h3>
                  <p className="text-gray-600">Guide you through solving problems with step-by-step reasoning.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-indigo-100 text-indigo-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">3</div>
                <div>
                  <h3 className="font-semibold">Study Strategies</h3>
                  <p className="text-gray-600">Provide effective study techniques and learning strategies.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-indigo-100 text-indigo-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">4</div>
                <div>
                  <h3 className="font-semibold">Progress Tracking</h3>
                  <p className="text-gray-600">Monitor your understanding and suggest areas for improvement.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <h2 className="text-3xl font-bold mb-4">Get Help Anytime, Anywhere</h2>
            <p className="text-gray-600 mb-6">
              Your personal AI study assistant is always ready to help you succeed academically.
            </p>
            <Link
              href="/auth"
              className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Start Learning with AI
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}