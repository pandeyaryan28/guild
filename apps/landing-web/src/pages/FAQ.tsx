import { motion } from 'motion/react';
import { FAQAccordion } from '../components/landing/FAQAccordion';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata';
import { JsonLd } from '../components/seo/JsonLd';
import { FAQ_ITEMS } from '../config/landingData';

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  'mainEntity': FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    'name': item.q,
    'acceptedAnswer': {
      '@type': 'Answer',
      'text': item.a,
    },
  })),
};

export function FAQ() {
  useDocumentMetadata({
    title: 'FAQ',
    description: 'Find answers to frequently asked questions about Guild Orbit, including setup time, billing details, and department permissions.',
    canonicalPath: '/faq',
  });

  return (
    <div className="pt-28 pb-20 px-6">
      <JsonLd schema={faqSchema} />
      {/* Header */}
      <section className="max-w-3xl mx-auto text-center mb-14">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[clamp(2rem,4vw,3rem)] font-bold text-ink tracking-tight"
        >
          Questions & answers
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-4 text-lg text-ink-light"
        >
          Everything you need to know about Guild Orbit.
        </motion.p>
      </section>

      <FAQAccordion />
    </div>
  );
}
