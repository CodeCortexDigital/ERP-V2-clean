export default function WelcomeBanner() {
  return (
    <div className="lg:col-span-3 bg-[#FFF1F2] p-6 rounded-2xl border border-rose-100 flex items-center justify-between relative overflow-hidden shadow-2xs">
      <div className="space-y-1 z-10">
        <h3 className="font-bold text-rose-500 text-sm">Welcome to Admin Dashboard</h3>
        <p className="text-xs text-slate-600 font-medium">
          Your Account is not Verified yet! <br className="hidden sm:inline"/>
          Please Verify your email address.{' '}
          <button
            onClick={() => alert('Verification email sent!')}
            className="text-blue-600 font-bold hover:underline"
          >
            Verify now!
          </button>
        </p>
      </div>
      <div className="w-32 h-24 flex-shrink-0 relative hidden sm:flex items-center justify-center">
        <svg className="w-full h-full text-rose-300" viewBox="0 0 160 120" fill="none">
          <circle cx="80" cy="50" r="25" fill="#FECDD3" />
          <rect x="50" y="80" width="60" height="30" rx="6" fill="#FB7185" />
          <rect x="65" y="70" width="30" height="15" rx="3" fill="#38BDF8" />
        </svg>
      </div>
    </div>
  );
}
