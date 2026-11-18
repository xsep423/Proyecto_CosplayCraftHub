import type { ReactNode } from 'react';
import { Wand2 } from 'lucide-react';
import ThemeToggle from '../layout/ThemeToggle';

/** Marco común de las pantallas sin sesión (recuperar y restablecer contraseña). */
export default function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
      </div>
      <ThemeToggle className="absolute top-4 right-4 z-20" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-2xl shadow-primary/30">
            <Wand2 size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text">CosplayCraft Hub</h1>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-text mb-2">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}
