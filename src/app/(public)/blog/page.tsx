import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Calendar, Clock, FileText } from 'lucide-react'

export const metadata = {
  title: 'Blog — Reclaim AI',
  description: 'Invoice recovery tips, dunning best practices, and freelance finance guides from the Reclaim AI team.',
}

const posts = [
  {
    slug: 'polite-invoice-payment-reminder',
    title: 'Polite Invoice Payment Reminder: 3 Email Templates for Freelancers',
    description: 'Three copy-paste email templates for following up on late invoices — plus the cadence and tone that actually get clients to pay without damaging the relationship.',
    date: 'July 8, 2026',
    readTime: '8 min read',
    category: 'Freelance Tips',
  },
]

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 lg:py-20">
        <Link href="/" className="inline-flex items-center text-sm text-slate-400 hover:text-indigo-600 transition-colors mb-8">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Home
        </Link>

        <header className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Blog</h1>
          <p className="mt-3 text-lg text-slate-500 max-w-2xl">
            Invoice recovery tips, dunning best practices, and freelance finance guides.
          </p>
        </header>

        <div className="space-y-8">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block group rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all p-6 bg-white"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-medium">{post.category}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {post.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {post.readTime}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {post.description}
                  </p>
                </div>
                <div className="flex items-center text-indigo-600 text-sm font-medium group-hover:translate-x-1 transition-transform shrink-0">
                  Read <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-20">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-600">No posts yet</h2>
            <p className="text-sm text-slate-400 mt-1">Check back soon for new articles.</p>
          </div>
        )}
      </div>
    </div>
  )
}
