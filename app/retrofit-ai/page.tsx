
import type { Metadata } from "next";
import RetrofitForm from "@/components/retrofit-ai/RetrofitForm";

export const metadata: Metadata = {
  title: "Retrofit AI | Retrofit Canada",
  description:
    "An AI advisor that helps homeowners plan a deep retrofit, prioritize upgrades, and find matching rebate programs.",
};

export default function RetrofitAiPage() {
  return (
    <section className="mx-auto max-w-[1340px] px-6 py-20 lg:px-12">
      <h1 className="font-saira text-4xl font-bold text-[#2e3249] sm:text-5xl">
        Retrofit AI
      </h1>

      <p className="mt-6 max-w-2xl font-roboto text-lg leading-relaxed text-slate-600">
        Describe your home and get a prioritized retrofit plan,
        ranked by cost and payback, matched to the federal and
        provincial rebate programs you may qualify for.
      </p>

      <RetrofitForm />
    </section>
  );
}
