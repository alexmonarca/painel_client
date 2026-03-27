import React from 'react';
import { Instagram, Facebook, Youtube, Plus } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative bg-[#121212] text-white pt-20 pb-10 overflow-hidden mt-12">
      {/* Background Image Overlay - Hot Air Balloons Sunset Theme */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none bg-cover bg-center mix-blend-overlay"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2073")' }}
      />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* About */}
          <div className="space-y-6">
            <img 
              src="https://raw.githubusercontent.com/alexmonarca/painel_client/main/logo-agenciamonarca-2026-bg-black.png" 
              alt="Agência Monarca" 
              className="h-10 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <p className="text-sm leading-relaxed text-gray-400 max-w-xs">
              A Agência Monarca tem uma solução inovadora de automação para atendimento utilizando Inteligência Artificial para agilizar a comunicação entre empresas e seus clientes. Conheça o IARA Monarca.
            </p>
          </div>

          {/* Configurações */}
          <div>
            <h4 className="font-bold text-lg mb-8 tracking-tight">Configurações</h4>
            <ul className="space-y-4">
              <li>
                <a href="https://painel.monarcahub.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-gray-400 hover:text-[#FF6321] transition-colors group">
                  <Plus className="w-3 h-3 text-[#FF6321] group-hover:rotate-90 transition-transform" />
                  Painel do Cliente
                </a>
              </li>
              <li>
                <a href="https://app.monarcahub.com/treinar-ia" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-gray-400 hover:text-[#FF6321] transition-colors group">
                  <Plus className="w-3 h-3 text-[#FF6321] group-hover:rotate-90 transition-transform" />
                  Cérebro da IA
                </a>
              </li>
              <li>
                <a href="https://chat.monarcahub.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-gray-400 hover:text-[#FF6321] transition-colors group">
                  <Plus className="w-3 h-3 text-[#FF6321] group-hover:rotate-90 transition-transform" />
                  Chat de Conversas
                </a>
              </li>
              <li>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 text-sm text-gray-400 hover:text-[#FF6321] transition-colors group">
                  <Plus className="w-3 h-3 text-[#FF6321] group-hover:rotate-90 transition-transform" />
                  Sua conta
                </button>
              </li>
            </ul>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-lg mb-8 tracking-tight">Links</h4>
            <ul className="space-y-4">
              <li>
                <a href="https://app.monarcahub.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-gray-400 hover:text-[#FF6321] transition-colors group">
                  <Plus className="w-3 h-3 text-[#FF6321] group-hover:rotate-90 transition-transform" />
                  App IARA
                </a>
              </li>
              <li>
                <a href="mailto:alex@monarcahub.com" className="flex items-center gap-3 text-sm text-gray-400 hover:text-[#FF6321] transition-colors group">
                  <Plus className="w-3 h-3 text-[#FF6321] group-hover:rotate-90 transition-transform" />
                  Contato
                </a>
              </li>
              <li>
                <a href="https://agencia.monarcahub.com/politica-de-privacidade/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-gray-400 hover:text-[#FF6321] transition-colors group">
                  <Plus className="w-3 h-3 text-[#FF6321] group-hover:rotate-90 transition-transform" />
                  Termos de Uso
                </a>
              </li>
              <li>
                <a href="https://agencia.monarcahub.com/politica-de-privacidade/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-gray-400 hover:text-[#FF6321] transition-colors group">
                  <Plus className="w-3 h-3 text-[#FF6321] group-hover:rotate-90 transition-transform" />
                  LGPD
                </a>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h4 className="font-bold text-lg mb-8 tracking-tight">Social media</h4>
            <p className="text-sm text-gray-400 mb-8">Fique por dentro de tudo acompanhando nossas redes</p>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/agenciamonarca" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-[#FF6321] hover:border-[#FF6321] transition-all group">
                <Instagram className="w-5 h-5 text-gray-400 group-hover:text-white" />
              </a>
              <a href="https://www.facebook.com/agenciamonarca" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-[#FF6321] hover:border-[#FF6321] transition-all group">
                <Facebook className="w-5 h-5 text-gray-400 group-hover:text-white" />
              </a>
              <a href="https://youtube.com/@agenciamonarca" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-[#FF6321] hover:border-[#FF6321] transition-all group">
                <Youtube className="w-5 h-5 text-gray-400 group-hover:text-white" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-10 text-center">
          <p className="text-sm text-gray-500 font-medium">
            Desenvolvido por <span className="text-[#FF6321] font-bold">Agência Monarca</span> com todo carinho
          </p>
        </div>
      </div>
    </footer>
  );
}
