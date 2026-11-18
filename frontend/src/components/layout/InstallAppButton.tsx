import { useEffect, useState } from 'react';
import { MonitorDown } from 'lucide-react';

// Evento que lanzan Chrome, Edge y Android cuando la app se puede instalar
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;

// Se escucha desde que carga el módulo para no perder el evento si llega antes de montar el botón
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferred = e as BeforeInstallPromptEvent;
  window.dispatchEvent(new Event('install-available'));
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  window.dispatchEvent(new Event('install-available'));
});

/** Solo aparece cuando el navegador permite instalar la app (PWA). */
export default function InstallAppButton() {
  const [canInstall, setCanInstall] = useState(() => deferred !== null);

  useEffect(() => {
    const sync = () => setCanInstall(deferred !== null);
    window.addEventListener('install-available', sync);
    return () => window.removeEventListener('install-available', sync);
  }, []);

  if (!canInstall) return null;

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    setCanInstall(false);
  };

  return (
    <button
      onClick={install}
      title="Instalar CosplayCraft Hub en este dispositivo"
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-primary border border-primary/30 hover:bg-primary/10 transition-colors"
    >
      <MonitorDown size={15} />
      <span className="hidden sm:inline">Instalar app</span>
    </button>
  );
}
