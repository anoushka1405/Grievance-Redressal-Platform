'use client';
import { Shield, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Props {
  title?: string;
  subtitle?: string;
  backHref?: string;
  showUser?: boolean;
}

export default function GovHeader({ title = 'National Grievance Portal', subtitle = 'Government of India | जन शिकायत पोर्टल', backHref, showUser = true }: Props) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-md">
      {/* Tri-color top strip */}
      <div className="h-1 bg-gradient-to-r from-saffron-500 via-white to-green-600" />
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {backHref && (
            <Link href={backHref} className="mr-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <div className="relative">
            <Shield className="w-9 h-9" />
            <div className="absolute inset-0 bg-orange-500 opacity-20 blur-sm rounded-full" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">{title}</h1>
            <p className="text-xs opacity-80">{subtitle}</p>
          </div>
        </div>

        {showUser && user && (
          <div className="flex items-center gap-4">
            <Link href={`/citizen/officer/${user.id}`} className="text-right hidden sm:block hover:underline cursor-pointer">
  <div className="text-sm font-medium">{user.name}</div>
  <div className="text-xs opacity-70 capitalize">{user.designation || user.role}</div>
</Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
