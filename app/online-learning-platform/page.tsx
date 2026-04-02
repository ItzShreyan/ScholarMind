import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Online Learning Platform | Interactive Study Tools | ScholarMind',
  description: 'Discover the best online learning platform with interactive study tools, AI-powered assistance, and personalized learning paths. Transform your education with ScholarMind.',
  keywords: 'online learning platform, interactive study tools, e-learning, digital education, online courses',
  openGraph: {
    title: 'Online Learning Platform for Modern Education',
    description: 'Interactive study tools and AI-powered learning for academic excellence.',
    type: 'website',
  },
};

export default function OnlineLearningPlatformPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Complete Online Learning Platform for Academic Success
          </h1>

          <p className="text-xl text-gray-600 mb-8">
            Experience the future of education with our comprehensive online learning platform.
            Featuring interactive study tools, AI-powered assistance, and personalized learning
            paths designed to maximize your academic potential.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">🎓</div>
              <h3 className="text-xl font-semibold mb-2">Interactive Learning</h3>
              <p className="text-gray-600">
                Engage with dynamic content and interactive exercises.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered</h3>
              <p className="text-gray-600">
                Personalized recommendations and intelligent tutoring.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Progress Tracking</h3>
              <p className="text-gray-600">
                Monitor your learning journey with detailed analytics.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold mb-4">Platform Features</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Smart Study Sessions</h3>
                <p className="text-gray-600">AI-optimized study sessions that adapt to your learning style.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Collaborative Learning</h3>
                <p className="text-gray-600">Connect with peers and study groups for better understanding.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Resource Library</h3>
                <p className="text-gray-600">Access thousands of educational resources and materials.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Mobile Learning</h3>
                <p className="text-gray-600">Learn anytime, anywhere with our mobile-optimized platform.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <h2 className="text-3xl font-bold mb-4">Start Your Learning Journey</h2>
            <p className="text-gray-600 mb-6">
              Join thousands of students who have transformed their academic performance.
            </p>
            <Link
              href="/auth"
              className="inline-block bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
            >
              Explore the Platform
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}