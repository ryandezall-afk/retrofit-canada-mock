import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Retrofit AI | Retrofit Canada',
  description:
    'An AI advisor that helps homeowners plan a deep retrofit, prioritize upgrades, and find matching rebate programs.',
};

// Placeholder page so the "RETROFIT AI" nav tab has a real route.
// Replace the body with the advisor UI when it's ready.
export default function RetrofitAiPage() {
  return (
    <main className="max-w-[1340px] mx-auto px-6 lg:px-12 py-20">
      <h1 className="font-saira text-4xl sm:text-5xl font-bold text-[#2e3249]">
        Retrofit AI
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-slate-600 font-roboto leading-relaxed">
        Describe your home and get a prioritized retrofit plan, ranked by cost and payback,
        matched to the federal and provincial rebate programs you may qualify for.
      </p>
      <p className="mt-10 inline-block rounded-lg bg-[#2e3249] px-5 py-3 text-sm font-semibold text-white">
        Coming soon
      </p>
    </main>
  );
}
