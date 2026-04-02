import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Academic Success Tips | Improve Grades & Performance | ScholarMind',
  description: 'Discover proven strategies for academic success. Learn time management, goal setting, and study habits that lead to better grades and lifelong learning skills.',
  keywords: 'academic success, improve grades, study habits, time management, goal setting',
  openGraph: {
    title: 'Academic Success Strategies and Tips',
    description: 'Proven methods to improve grades and achieve academic excellence.',
    type: 'website',
  },
};

export default function AcademicSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Achieve Academic Success with Proven Strategies
          </h1>

          <p className="text-xl text-gray-600 mb-8">
            Unlock your academic potential with comprehensive strategies for success. From effective
            study habits and time management to goal setting and motivation techniques, discover
            what it takes to excel in your studies.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2">Goal Setting</h3>
              <p className="text-gray-600">
                Set SMART goals and track progress towards academic achievement.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">⏱️</div>
              <h3 className="text-xl font-semibold mb-2">Time Management</h3>
              <p className="text-gray-600">
                Master your schedule with effective planning and prioritization.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">📈</div>
              <h3 className="text-xl font-semibold mb-2">Performance Tracking</h3>
              <p className="text-gray-600">
                Monitor grades, habits, and progress for continuous improvement.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold mb-4">Keys to Academic Success</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">1</div>
                <div>
                  <h3 className="font-semibold">Consistent Study Habits</h3>
                  <p className="text-gray-600">Establish a regular study routine that fits your lifestyle and learning style.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">2</div>
                <div>
                  <h3 className="font-semibold">Active Learning</h3>
                  <p className="text-gray-600">Engage actively with material through questioning, discussion, and application.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">3</div>
                <div>
                  <h3 className="font-semibold">Seek Help When Needed</h3>
                  <p className="text-gray-600">Don&apos;t hesitate to ask for clarification or additional resources when struggling.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">4</div>
                <div>
                  <h3 className="font-semibold">Maintain Balance</h3>
                  <p className="text-gray-600">Balance academics with rest, exercise, and social activities for sustainable success.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <h2 className="text-3xl font-bold mb-4">Start Your Success Journey</h2>
            <p className="text-gray-600 mb-6">
              Transform your academic performance with tools and strategies designed for success.
            </p>
            <Link
              href="/auth"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Achieve Academic Success
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}