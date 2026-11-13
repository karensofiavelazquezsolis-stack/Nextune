import React from 'react';

interface ShareModalProps {
  title: string;
  url: string;
  onClose: () => void;
  notify: (msg: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ title, url, onClose, notify }) => {
  // 1. Copiar Enlace al portapapeles
  const handleCopyLink = () => {
    navigator.clipboard.writeText(url).then(() => {
      notify("¡Enlace copiado al portapapeles! 📋");
      onClose();
    }).catch(() => {
      notify("No se pudo copiar el enlace");
    });
  };

  // 2. Compartir por WhatsApp
  const handleWhatsApp = () => {
    const text = encodeURIComponent(`¡Escucha "${title}" en NextTune! 🎵\n${url}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    onClose();
  };

  // 3. Compartir por Facebook
  const handleFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(fbUrl, '_blank');
    onClose();
  };

  // 4. Compartir por Correo Electrónico
  const handleEmail = () => {
    const subject = encodeURIComponent(`Te comparto esto en NextTune: ${title}`);
    const body = encodeURIComponent(`¡Hola! Te comparto esta música en NextTune:\n\n${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    onClose();
  };

  // 5. Compartir Nativo (Móviles: abre Instagram, Messenger, etc., si el navegador lo soporta)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'NextTune',
          text: `Escucha "${title}" en NextTune`,
          url: url,
        });
        onClose();
      } catch (e) {
        // Cancelado por el usuario
      }
    } else {
      notify("Tu navegador no soporta el menú de compartir nativo");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#181818] border border-[#282828] w-full max-w-sm rounded-2xl p-6 text-white shadow-2xl relative">
        
        {/* Botón Cerrar */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg font-bold"
        >
          ✕
        </button>

        <h3 className="text-lg font-bold mb-2 text-center">Compartir</h3>
        <p className="text-xs text-gray-400 text-center truncate mb-6 px-2">{title}</p>

        {/* Opciones de compartir */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          
          {/* WhatsApp */}
          <button 
            onClick={handleWhatsApp}
            className="flex flex-col items-center gap-2 p-3 bg-[#222] hover:bg-[#2a2a2a] rounded-xl transition group"
          >
            <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white text-xl shadow-lg group-hover:scale-105 transition">
              💬
            </div>
            <span className="text-xs text-gray-300">WhatsApp</span>
          </button>

          {/* Facebook */}
          <button 
            onClick={handleFacebook}
            className="flex flex-col items-center gap-2 p-3 bg-[#222] hover:bg-[#2a2a2a] rounded-xl transition group"
          >
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl shadow-lg group-hover:scale-105 transition">
              f
            </div>
            <span className="text-xs text-gray-300">Facebook</span>
          </button>

          {/* Correo */}
          <button 
            onClick={handleEmail}
            className="flex flex-col items-center gap-2 p-3 bg-[#222] hover:bg-[#2a2a2a] rounded-xl transition group"
          >
            <div className="w-12 h-12 rounded-full bg-[#FF6A00] flex items-center justify-center text-black text-xl shadow-lg group-hover:scale-105 transition">
              ✉️
            </div>
            <span className="text-xs text-gray-300">Correo</span>
          </button>

        </div>

        {/* Botón de Menú Nativo (Instagram, Messenger, etc. en móviles) */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button 
            onClick={handleNativeShare}
            className="w-full mb-3 py-2.5 px-4 bg-[#282828] hover:bg-[#333] rounded-xl text-xs font-semibold text-white transition flex items-center justify-center gap-2"
          >
            📱 Más opciones (Instagram, Messenger...)
          </button>
        )}

        {/* Copiar Enlace */}
        <button 
          onClick={handleCopyLink}
          className="w-full py-2.5 px-4 bg-[#FF6A00]/10 border border-[#FF6A00]/30 hover:bg-[#FF6A00]/20 rounded-xl text-xs font-bold text-[#FF6A00] transition flex items-center justify-center gap-2"
        >
          🔗 Copiar enlace
        </button>

      </div>
    </div>
  );
};