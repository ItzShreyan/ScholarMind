import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Effective Study Techniques | Proven Learning Methods | ScholarMind',
  description: 'Master effective study techniques including active recall, spaced repetition, and mind mapping. Learn proven methods to improve memory retention and academic performance.',
  keywords: 'study techniques, learning methods, active recall, spaced repetition, study skills',
  openGraph: {
    title: 'Effective Study Techniques for Better Learning',
    description: 'Proven study methods to improve memory and academic success.',
    type: 'website',
  },
};

export default function StudyTechniquesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-lime-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Proven Study Techniques for Academic Excellence
          </h1>

          <p className="text-xl text-gray-600 mb-8">
            Transform your study habits with scientifically-proven techniques that enhance memory
            retention and learning efficiency. From active recall to spaced repetition, discover
            methods that actually work.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">🧠</div>
              <h3 className="text-xl font-semibold mb-2">Active Recall</h3>
              <p className="text-gray-600">
                Test yourself to strengthen memory and understanding.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">⏰</div>
              <h3 className="text-xl font-semibold mb-2">Spaced Repetition</h3>
              <p className="text-gray-600">
                Review material at optimal intervals for long-term retention.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">🗺️</div>
              <h3 className="text-xl font-semibold mb-2">Mind Mapping</h3>
              <p className="text-gray-600">
                Visualize connections between concepts for better comprehension.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold mb-4">Essential Study Techniques</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Pomodoro Technique</h3>
                <p className="text-gray-600">Study for 25 minutes, then take a 5-minute break. This maintains focus and prevents burnout.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Feynman Technique</h3>
                <p className="text-gray-600">Explain concepts in simple terms as if teaching someone else. This reveals gaps in understanding.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">SQ3R Method</h3>
                <p className="text-gray-600">Survey, Question, Read, Recite, Review - a systematic approach to reading and studying texts.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Interleaved Practice</h3>
                <p className="text-gray-600">Mix different topics during study sessions rather than focusing on one at a time.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <h2 className="text-3xl font-bold mb-4">Master Study Techniques</h2>
            <p className="text-gray-600 mb-6">
              Learn and apply proven study methods that will boost your academic performance.
            </p>
            <Link
              href="/auth"
              className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Start Learning Techniques
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}