import { NavLink } from 'react-router-dom';
import { Camera, BrainCircuit, Bot, Settings, Volume2, VolumeX } from 'lucide-react';
import { useAccessibility } from '@/context/AccessibilityContext';
import ClawAILogoSquare from '@/assets/logos/clawai-logo-square.png';

export default function Navbar() {
  const { isEnabled, toggleAccessibility, speakText } = useAccessibility();

  const handleToggle = () => {
    toggleAccessibility();
    speakText(isEnabled ? 'Modo de acessibilidade desativado' : 'Modo de acessibilidade ativado');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center p-3 rounded-lg transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
    }`;

  return (
    <nav className="fixed left-0 top-0 h-full w-25 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-6 z-50">
      <div className="mb-6" >
        <img src={ClawAILogoSquare} alt="Claw AI Logo" className="w-24 h-25 rounded-lg"/>
      </div>

      <div className="flex flex-col space-y-4 flex-1">
        <NavLink
          to="/live-monitor"
          className={navLinkClass}
          onMouseEnter={() => speakText('Monitoramento ao Vivo')}
        >
          <Camera className="w-6 h-6" />
          <span className="text-xs mt-1">Monitor</span>
        </NavLink>
        <NavLink
          to="/training"
          className={navLinkClass}
          onMouseEnter={() => speakText('Treinamento de IA')}
        >
          <BrainCircuit className="w-6 h-6" />
          <span className="text-xs mt-1">Treino</span>
        </NavLink>
      </div>

      <div className="flex flex-col space-y-4">
        <button
          onClick={handleToggle}
          onMouseEnter={() => speakText('Alternar modo de acessibilidade')}
          className={`flex flex-col items-center p-3 rounded-lg transition-colors ${
            isEnabled
              ? 'text-blue-400'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          {isEnabled ? (
            <Volume2 className="w-6 h-6" />
          ) : (
            <VolumeX className="w-6 h-6" />
          )}
          <span className="text-xs mt-1">Voz</span>
        </button>
        
        <NavLink
          to="/settings" // (Rota ainda não existe, mas ok)
          className={navLinkClass}
          onMouseEnter={() => speakText('Configurações')}
        >
          <Settings className="w-6 h-6" />
          <span className="text-xs mt-1">Ajustes</span>
        </NavLink>
      </div>
    </nav>
  );
}