import { Sparkles } from "@/components/animations/Sparkles";
import { AnimatedGradientText } from "@/components/animations/AnimatedGradientText";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#FFF5F8] via-[#FFE4EC] to-[#FFD1DC] p-4">
      <Sparkles count={18} />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <h1 className="pmu-blur-fade is-visible mb-4 text-2xl font-semibold tracking-tight sm:mb-6 sm:text-3xl">
          <AnimatedGradientText>Polish Me Up</AnimatedGradientText>
        </h1>
        <div className="pmu-pop-in w-full rounded-2xl border border-[#F8BBD0] bg-white/90 p-5 shadow-[0_8px_32px_-8px_rgba(244,143,177,0.35)] backdrop-blur-sm sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
