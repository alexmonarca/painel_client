import React from 'react';
import { Star, ExternalLink } from 'lucide-react';

export function ReviewBlock() {
  const reviewUrl = "https://g.page/r/CUyUuT1SWkU5EAE/review";

  return (
    <div className="bg-app-card p-8 rounded-3xl border border-app shadow-sm transition-all">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <h3 className="text-xl font-bold text-app-foreground mb-2">
            Como você classifica a <span className="text-[#FF6321]">agência monarca</span> no momento?
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Sua opinião é fundamental para continuarmos evoluindo nossa estratégia.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <a
                key={star}
                href={reviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:scale-110 transition-transform group"
              >
                <Star className="w-8 h-8 text-gray-200 dark:text-white/10 group-hover:text-[#FF6321] fill-transparent group-hover:fill-[#FF6321] transition-colors" />
              </a>
            ))}
          </div>
          <a
            href={reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold uppercase tracking-widest text-[#FF6321] hover:underline flex items-center gap-1"
          >
            Avaliar no Google <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
