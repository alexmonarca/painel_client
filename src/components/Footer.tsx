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
            <div className="text-xl font-bold tracking-tight">
              Agência <span className="text-[#FF6321]">Monarca</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-400 max-w-xs">
              A Agência Monarca tem uma solução inovadora de automação para atendimento utilizando Inteligência Artificial para agilizar a comunicação entre empresas e seus clientes. Conheça o MonarChat AI.
            </p>
          </div>

          {/* Configurações */}
          <div>
            <h4 className="font-bold text-lg mb-8 tracking-tight">Configurações</h4>
            <ul className="space-y-4">
              {[
                'Painel do Cliente',
                'Cérebro da IA',
                'Chat de Conversas',
                'Sua conta'
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-gray-400 hover:text-[#FF6321] cursor-pointer transition-colors group">
                  <Plus className="w-3 h-3 text-[#FF6321] group-hover:rotate-90 transition-transform" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-lg mb-8 tracking-tight">Links</h4>
            <ul className="space-y-4">
              {[
                'App MonarChatAI',
                'Contato',
                'Termos de Uso',
                'LGPD'
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-gray-400 hover:text-[#FF6321] cursor-pointer transition-colors group">
                  <Plus className="w-3 h-3 text-[#FF6321] group-hover:rotate-90 transition-transform" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h4 className="font-bold text-lg mb-8 tracking-tight">Social media</h4>
            <p className="text-sm text-gray-400 mb-8">Fique por dentro de tudo acompanhando nossas redes</p>
            <div className="flex gap-4">
              <a href="#" className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-[#FF6321] hover:border-[#FF6321] transition-all group">
                <Instagram className="w-5 h-5 text-gray-400 group-hover:text-white" />
              </a>
              <a href="#" className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-[#FF6321] hover:border-[#FF6321] transition-all group">
                <Facebook className="w-5 h-5 text-gray-400 group-hover:text-white" />
              </a>
              <a href="#" className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-[#FF6321] hover:border-[#FF6321] transition-all group">
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
