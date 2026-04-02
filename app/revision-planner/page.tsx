import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Revision Planner | Smart Study Schedule Creator | ScholarMind',
  description: 'Create personalized revision schedules with AI-powered planning. Optimize your study time with smart scheduling that adapts to your learning style and exam dates.',
  keywords: 'revision planner, study schedule, exam preparation, study planner, revision timetable',
  openGraph: {
    title: 'Smart Revision Planner for Exam Success',
    description: 'Create personalized study schedules that maximize your revision effectiveness.',
    type: 'website',
  },
};

export default function RevisionPlannerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Smart Revision Planner for Exam Success
          </h1>

          <p className="text-xl text-gray-600 mb-8">
            Maximize your study efficiency with AI-powered revision planning. Our intelligent system
            creates personalized study schedules that adapt to your learning pace, subject difficulty,
            and exam timeline for optimal academic performance.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">📅</div>
              <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
              <p className="text-gray-600">
                AI creates optimal study sessions based on your exam dates and learning capacity.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2">Goal-Oriented</h3>
              <p className="text-gray-600">
                Set specific targets and track progress towards your academic goals.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Progress Analytics</h3>
              <p className="text-gray-600">
                Monitor your study habits and adjust your plan for better results.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold mb-4">Features That Make Revision Effective</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-orange-100 text-orange-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">✓</div>
                <div>
                  <h3 className="font-semibold">Spaced Repetition Integration</h3>
                  <p className="text-gray-600">Combines revision planning with proven memory techniques.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-orange-100 text-orange-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">✓</div>
                <div>
                  <h3 className="font-semibold">Subject Prioritization</h3>
                  <p className="text-gray-600">Focus on weak areas while maintaining strong subjects.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-orange-100 text-orange-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">✓</div>
                <div>
                  <h3 className="font-semibold">Break Reminders</h3>
                  <p className="text-gray-600">Prevents burnout with scheduled breaks and rest periods.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-orange-100 text-orange-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">✓</div>
                <div>
                  <h3 className="font-semibold">Flexible Adjustments</h3>
                  <p className="text-gray-600">Modify your plan as needed while maintaining optimal study patterns.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <h2 className="text-3xl font-bold mb-4">Plan Your Revision Journey</h2>
            <p className="text-gray-600 mb-6">
              Stop wasting time on ineffective study methods. Get a personalized revision plan that works.
            </p>
            <Link
              href="/auth"
              className="inline-block bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
            >
              Create Your Study Plan
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}