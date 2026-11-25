
import type { Metadata } from "next";
import RetrofitForm from "@/components/retrofit-ai/RetrofitForm";

export const metadata: Metadata = {
  title: "Retrofit AI | Retrofit Canada",
  description:
    "An AI advisor that helps homeowners plan a deep retrofit, prioritize upgrades, and find matching rebate programs.",
};

export default function RetrofitAiPage() {
  return (
    <section className="mx-auto max-w-[1340px] px-4 py-12 sm:px-6 sm:py-16 lg:px-12">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-saira text-3xl font-bold text-rc-navy sm:text-5xl">
          Retrofit AI
        </h1>

        <p className="mt-4 font-roboto text-base leading-relaxed text-slate-600 sm:text-lg">
          Describe your home and get a prioritized retrofit plan,
          ranked by cost and payback, matched to the federal and
          provincial rebate programs you may qualify for.
        </p>
      </div>

      <RetrofitForm />
    </section>
  );
}
