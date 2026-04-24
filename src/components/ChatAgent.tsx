import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Send, Bot, User, Loader2, Sparkles, X, Calendar } from 'lucide-react';
import { Client, Delivery } from '../types';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatAgentProps {
  client: Client;
  deliveries: Delivery[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function ChatAgent({ client, deliveries, isOpen, onClose, onUpdate }: ChatAgentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch history on mount
  useEffect(() => {
    if (isOpen && client.id) {
      fetchHistory();
    }
  }, [isOpen, client.id]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) {
        setMessages(data.map(m => ({ role: m.role as 'user' | 'model', text: m.content })));
      }
    } catch (err) {
      console.error('Error fetching chat history:', err);
    }
  };

  const saveMessage = async (role: 'user' | 'model', content: string) => {
    try {
      await supabase
        .from('chat_messages')
        .insert([{ client_id: client.id, role, content }]);
    } catch (err) {
      console.error('Error saving message:', err);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);
    
    // Save user message to DB
    await saveMessage('user', userMessage);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const deliveriesContext = deliveries.map(d => 
        `- ID: ${d.id}, Data: ${d.delivery_date}, Descrição: ${d.description}, Status: ${d.status}`
      ).join('\n');

      const updateDeliveryTool: FunctionDeclaration = {
        name: "update_delivery",
        description: "Atualiza uma entrega existente no calendário do cliente.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "O ID único da entrega." },
            description: { type: Type.STRING, description: "A nova descrição ou ideia para a entrega." },
            delivery_date: { type: Type.STRING, description: "A nova data da entrega (formato YYYY-MM-DD)." },
            status: { type: Type.STRING, description: "O novo status da entrega (opcional)." }
          },
          required: ["id"]
        }
      };

      const createDeliveryTool: FunctionDeclaration = {
        name: "create_delivery",
        description: "Cria uma nova entrega ou ideia no calendário do cliente.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: "A descrição ou ideia para a nova entrega." },
            delivery_date: { type: Type.STRING, description: "A data da entrega (formato YYYY-MM-DD)." }
          },
          required: ["description", "delivery_date"]
        }
      };

      const systemInstruction = `Você é o Estrategista Sênior de Marketing da Agência Monarca.
Seu tom é profissional, inspirador, direto e altamente estratégico. Você não é apenas um assistente, você é um parceiro de crescimento para o cliente.

DATA ATUAL: ${new Date().toLocaleDateString('pt-BR')}
CLIENTE: ${client.company_name}
ESPECIALIDADE/ESCOPO: ${client.budget_details.description || 'Marketing Digital e Social Media'}
PLANO ATUAL: ${client.budget_details.plan || 'Premium'}

CALENDÁRIO ATUAL (CONTEXTO):
${deliveriesContext || 'Nenhuma entrega registrada ainda.'}

SUA MISSÃO:
1. Analisar o feedback do cliente sobre o calendário e sugerir melhorias estratégicas.
2. Propor ganchos de vendas (copywriting), CTAs (Call to Action) e formatos (Reels, Carrossel, Stories) que convertam.
3. Manter-se estritamente dentro da especialidade do cliente: ${client.budget_details.description}.
4. Se o cliente concordar com uma alteração ou nova ideia, use as ferramentas disponíveis para atualizar ou criar a entrega no calendário.
5. NUNCA prometa alterações de orçamento ou prazos operacionais. Foque na ESTRATÉGIA e no CONTEÚDO.
6. Use emojis de forma profissional para dar personalidade à Agência Monarca.

REGRAS DE OURO:
- Respostas curtas e impactantes.
- Foco em resultados e autoridade de marca.
- Se o cliente pedir algo fora do escopo, direcione-o gentilmente para falar com o gerente de conta humano.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction,
          temperature: 0.8,
          tools: [{ functionDeclarations: [updateDeliveryTool, createDeliveryTool] }]
        },
      });

      const functionCalls = response.functionCalls;
      if (functionCalls) {
        const toolResponses = [];
        for (const call of functionCalls) {
          try {
            if (call.name === 'update_delivery') {
              const { id, ...updates } = call.args as any;
              const { error } = await supabase
                .from('deliveries')
                .update(updates)
                .eq('id', id);
              
              if (error) throw error;
              toolResponses.push({
                functionResponse: {
                  name: call.name,
                  response: { status: "success", message: "Entrega atualizada com sucesso." }
                }
              });
            } else if (call.name === 'create_delivery') {
              const args = call.args as any;
              const { error } = await supabase
                .from('deliveries')
                .insert([{ ...args, client_id: client.id, status: 'ideia apresentada' }]);
              
              if (error) throw error;
              toolResponses.push({
                functionResponse: {
                  name: call.name,
                  response: { status: "success", message: "Nova entrega criada com sucesso." }
                }
              });
            }
          } catch (err) {
            toolResponses.push({
              functionResponse: {
                name: call.name,
                response: { status: "error", message: err instanceof Error ? err.message : String(err) }
              }
            });
          }
        }

        if (onUpdate) onUpdate();

        // After tool execution, get a final response from the model
        const followUpResponse = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            ...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
            { role: 'user', parts: [{ text: userMessage }] },
            response.candidates?.[0]?.content as any,
            {
              role: 'user',
              parts: toolResponses
            }
          ],
          config: { systemInstruction }
        });
        
        const aiText = followUpResponse.text || "Ação concluída com sucesso!";
        setMessages(prev => [...prev, { role: 'model', text: aiText }]);
        await saveMessage('model', aiText);
      } else {
        const aiText = response.text || "Desculpe, tive um problema ao processar sua ideia. Pode repetir?";
        setMessages(prev => [...prev, { role: 'model', text: aiText }]);
        await saveMessage('model', aiText);
      }
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { role: 'model', text: "Ocorreu um erro na conexão com o especialista. Tente novamente em alguns instantes." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-[400px] animate-in slide-in-from-bottom-8 duration-300">
      <div className="bg-app-card rounded-3xl shadow-2xl border border-app overflow-hidden flex flex-col h-[600px]">
        {/* Header */}
        <div className="bg-gray-900 dark:bg-black p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6321] flex items-center justify-center shadow-lg shadow-[#FF6321]/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Estrategista Monarca</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-white/50 font-medium uppercase tracking-wider">Online agora</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl text-white/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth bg-app-background/30"
        >
          {messages.length === 0 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#FF6321]/10 flex items-center justify-center mx-auto">
                <Bot className="w-8 h-8 text-[#FF6321]" />
              </div>
              <div className="space-y-2">
                <p className="text-app-foreground font-bold">Olá! Sou seu estrategista dedicado.</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[240px] mx-auto">
                  Como posso ajudar a elevar o marketing da <span className="text-[#FF6321] font-bold">{client.company_name}</span> hoje?
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div 
              key={i}
              className={cn(
                "flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                msg.role === 'user' ? "bg-gray-100 dark:bg-white/10" : "bg-[#FF6321]/10"
              )}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-gray-500 dark:text-white/50" /> : <Bot className="w-4 h-4 text-[#FF6321]" />}
              </div>
              <div className={cn(
                "p-4 rounded-2xl text-sm leading-relaxed max-w-[80%]",
                msg.role === 'user' 
                  ? "bg-gray-900 text-white rounded-tr-none" 
                  : "bg-app-card text-app-foreground border border-app rounded-tl-none shadow-sm"
              )}>
                {msg.text}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#FF6321]/10 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-[#FF6321] animate-spin" />
              </div>
              <div className="p-4 rounded-2xl bg-app-card border border-app rounded-tl-none">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-6 bg-app-card border-t border-app">
          <div className="relative">
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Digite sua ideia ou feedback..."
              rows={1}
              className="w-full pl-4 pr-12 py-4 bg-gray-50 dark:bg-white/5 border border-app rounded-2xl focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] outline-none transition-all text-app-foreground resize-none min-h-[56px] max-h-32 overflow-y-auto"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 p-2 bg-[#FF6321] text-white rounded-xl hover:bg-[#e5591e] transition-all disabled:opacity-50 disabled:hover:bg-[#FF6321]"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-3">
            Powered by Monarca AI • Marketing Estratégico
          </p>
        </div>
      </div>
    </div>
  );
}
