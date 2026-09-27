/**
 * app/contact/page.tsx
 *
 * WHAT THIS FILE DOES:
 * This is the Contact page — a simple two-column layout with site contact info
 * on the left and a message form on the right. It is a Server Component, meaning
 * it renders entirely on the server with no client-side JavaScript of its own.
 *
 * The actual form (with state, validation, and submission) lives in the
 * separate ContactForm component (app/components/ui/ContactForm.tsx) which is
 * a Client Component ('use client') — that separation is required by Next.js.
 *
 * LAYOUT BREAKDOWN:
 * • The page uses a CSS Grid (md:grid-cols-5) so on medium+ screens the left
 *   info panel takes 2 columns and the form takes 3 columns.
 * • On mobile (<md) both panels stack vertically.
 *
 * The three info cards (Email / Based in / Response time) are built from an
 * array so adding a new card is as simple as adding one object to the array.
 *
 * HOW TO REUSE:
 * Copy this two-column "info + form" layout for any contact or landing section.
 * Replace the array items with your own contact details. Swap ContactForm for
 * any form component you like.
 *
 * export const metadata sets the <title> tag for SEO — Next.js reads this
 * automatically from any page.tsx or layout.tsx file.
 */
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import ContactForm from '@/app/components/ui/ContactForm';

export const metadata = { title: 'Contact — Silent Evidence' };

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <div className="max-w-5xl mx-auto px-4 py-14 grid md:grid-cols-5 gap-12">
        {/* Left — info */}
        <div className="md:col-span-2 space-y-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-2">
              Get in touch
            </p>
            <h1 className="text-4xl font-bold text-white leading-tight">Contact Us</h1>
            <p className="text-gray-400 text-sm mt-3 leading-relaxed">
              Have a question, a report, or just want to say hello? Fill in the form and we will get
              back to you as soon as we can.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"
                    />
                  </svg>
                ),
                label: 'Email',
                value: 'hello@silentevidence.com',
              },
              {
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"
                    />
                    <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ),
                label: 'Based in',
                value: 'Worldwide — we are fully remote.',
              },
              {
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
                    />
                  </svg>
                ),
                label: 'Response time',
                value: 'Usually within 24–48 hours.',
              },
            ].map(({ icon, label, value }) => (
              <div
                key={label}
                className="flex items-start gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4"
              >
                <div className="w-9 h-9 flex-shrink-0 bg-red-600/10 border border-red-600/20 rounded-lg flex items-center justify-center text-red-500">
                  {icon}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                  <p className="text-sm text-white">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form */}
        <div className="md:col-span-3 bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <ContactForm />
        </div>
      </div>
      <Footer />
    </main>
  );
}
