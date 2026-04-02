import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Homework Help | Get Instant Assignment Support | ScholarMind',
  description: 'Get instant homework help with step-by-step solutions, explanations, and AI tutoring. Overcome challenging assignments with ScholarMind\'s comprehensive homework assistance.',
  keywords: 'homework help, assignment help, math homework, science homework, AI tutoring',
  openGraph: {
    title: 'Homework Help with AI Tutoring',
    description: 'Get instant help with homework and assignments from AI tutors.',
    type: 'website',
  },
};

export default function HomeworkHelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Instant Homework Help with AI Tutoring
          </h1>

          <p className="text-xl text-gray-600 mb-8">
            Stuck on homework? Get instant help with step-by-step solutions, clear explanations,
            and personalized guidance from our AI tutors. Available 24/7 for all subjects and grade levels.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">✏️</div>
              <h3 className="text-xl font-semibold mb-2">Step-by-Step Solutions</h3>
              <p className="text-gray-600">
                Detailed solutions that help you understand the process.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">💡</div>
              <h3 className="text-xl font-semibold mb-2">Concept Explanations</h3>
              <p className="text-gray-600">
                Clear explanations of difficult concepts and topics.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-4">📖</div>
              <h3 className="text-xl font-semibold mb-2">All Subjects</h3>
              <p className="text-gray-600">
                Help with math, science, literature, history, and more.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold mb-4">How Homework Help Works</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-yellow-100 text-yellow-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">1</div>
                <div>
                  <h3 className="font-semibold">Submit Your Question</h3>
                  <p className="text-gray-600">Upload your homework problem or describe the issue.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-yellow-100 text-yellow-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">2</div>
                <div>
                  <h3 className="font-semibold">Get Instant Help</h3>
                  <p className="text-gray-600">Receive step-by-step guidance and explanations immediately.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-yellow-100 text-yellow-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">3</div>
                <div>
                  <h3 className="font-semibold">Learn and Understand</h3>
                  <p className="text-gray-600">Not just answers, but learning that sticks with you.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-yellow-100 text-yellow-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">4</div>
                <div>
                  <h3 className="font-semibold">Practice More</h3>
                  <p className="text-gray-600">Get similar problems to practice and reinforce learning.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <h2 className="text-3xl font-bold mb-4">Get Help with Homework Now</h2>
            <p className="text-gray-600 mb-6">
              Don&apos;t struggle alone. Get the homework help you need to succeed.
            </p>
            <Link
              href="/auth"
              className="inline-block bg-yellow-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
            >
              Start Getting Help
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}