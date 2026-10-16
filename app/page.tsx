import Link from "next/link";
import {
  BookOpen,
  DollarSign,
  Utensils,
  ArrowRight,
  Terminal,
  Layers,
  CheckSquare,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      {/* Top Navbar */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-black/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-black text-white dark:bg-white dark:text-black font-semibold text-xs tracking-tight shadow-xs">
              L
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Life OS
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-3 py-1.5 text-xs font-mono text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-3.5 py-1.5 rounded-md text-xs font-mono uppercase bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors shadow-xs"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 text-2xs font-mono uppercase tracking-widest mb-6">
          <Terminal className="h-3 w-3" />
          <span>MINIMALIST PERSONAL OPERATING SYSTEM</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight">
          Execute On Your Mind, Capital, and Body.
        </h1>

        <p className="mt-4 text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-xl font-mono leading-relaxed">
          No 13-field forms. Built for fast execution with learning roadmaps, task breakdowns, instant meal logging, and cash flow tracking.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/register"
            className="w-full sm:w-auto px-6 py-2.5 rounded-md bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-xs font-mono uppercase font-bold tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <span>Launch Dashboard</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-mono uppercase hover:border-black dark:hover:border-white transition-all text-center"
          >
            Sign In
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl w-full text-left">
          <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span className="font-semibold tracking-wider uppercase text-zinc-500">01. ROADMAPS</span>
              <BookOpen className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-black dark:text-white">
              Skill Roadmaps & Notes
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Curriculum phases, live study stopwatch, markdown notes synthesis with URL routing, and resource tracking.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span className="font-semibold tracking-wider uppercase text-zinc-500">02. CAPITAL</span>
              <DollarSign className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-black dark:text-white">
              Cash Flow Control
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Record expenses and income with simple natural shorthand (-$15 lunch, +500 freelance) with zero friction.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span className="font-semibold tracking-wider uppercase text-zinc-500">03. FUEL</span>
              <Utensils className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-black dark:text-white">
              Instant Nutrition Log
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Time-aware meal detection. Type what you ate naturally and log calories and macros instantly.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
