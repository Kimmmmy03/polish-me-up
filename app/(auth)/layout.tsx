export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FDF2F4] p-4">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight text-[#E91E63]">
        Polish Me Up
      </h1>
      <div className="w-full max-w-sm rounded-2xl border border-[#F8BBD0] bg-white p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
