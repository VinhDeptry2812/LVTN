import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Send, X, Bot, User, ExternalLink, RefreshCw, ShoppingBag, Trash2 } from 'lucide-react';
import { sendChatMessage } from '../services/ai.service';
import type { ChatMessage, SuggestedProduct } from '../services/ai.service';


interface MessageItem extends ChatMessage {
  id: string;
  suggestedProducts?: SuggestedProduct[];
}

interface AIChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  currentProductId?: number;
}

const DEFAULT_WELCOME_MESSAGE: MessageItem = {
  id: 'welcome',
  role: 'model',
  content:
    'Xin chào! Em là trợ lý AI chuyên tư vấn nội thất. Anh/chị đang muốn tìm sản phẩm cho không gian nào (phòng khách, phòng ngủ, phòng ăn...) hay cần hỗ trợ thông tin gì ạ?',
};

export default function AIChatbot({ isOpen, onClose, currentProductId }: AIChatbotProps) {
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<MessageItem[]>(() => {
    try {
      const saved = localStorage.getItem('ai_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Lỗi khi nạp lịch sử chat AI:', e);
    }
    return [DEFAULT_WELCOME_MESSAGE];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Lưu tự động lịch sử trò chuyện vào localStorage khi messages thay đổi
  useEffect(() => {
    try {
      localStorage.setItem('ai_chat_history', JSON.stringify(messages));
    } catch (e) {
      console.error('Lỗi khi lưu lịch sử chat AI:', e);
    }
  }, [messages]);

  const handleClearHistory = () => {
    if (window.confirm('Anh/chị có chắc muốn xóa lịch sử trò chuyện này không?')) {
      setMessages([DEFAULT_WELCOME_MESSAGE]);
      localStorage.removeItem('ai_chat_history');
    }
  };

  const quickPrompts = [
    'Tư vấn sofa phòng khách',
    'Bàn ăn 4-6 người giá tốt',
    'Chính sách vận chuyển & bảo hành',
    'Gợi ý combo trang trí phòng ngủ',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputMessage.trim();
    if (!text || isLoading) return;

    setShowQuickPrompts(false);

    const userMsgId = Date.now().toString();
    const newMessages: MessageItem[] = [
      ...messages,
      { id: userMsgId, role: 'user', content: text },
    ];

    setMessages(newMessages);
    if (!textToSend) setInputMessage('');
    setIsLoading(true);

    try {
      // Prepare history for API
      const historyForApi: ChatMessage[] = newMessages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await sendChatMessage(text, historyForApi, currentProductId);

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: res.reply,
          suggestedProducts: res.suggestedProducts,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content:
            'Rất tiếc, hệ thống tư vấn đang gặp gián đoạn tạm thời. Anh/chị vui lòng thử lại sau giây lát nhé!',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Helper hiển thị nội dung tin nhắn sạch (loại bỏ ID thô và render in đậm cho **)
  const renderFormattedContent = (text: string) => {
    if (!text) return null;
    // 1. Lọc bỏ các chuỗi (ID: 123) hoặc ID: 123 và các từ tên cửa hàng nằm trong ngoặc kép ""
    const cleanText = text
      .replace(/\s*\(ID:\s*\d+\)/gi, '')
      .replace(/\s*ID:\s*\d+/gi, '')
      .replace(/cửa hàng\s*["“'«]Nội Thất["”'»]/gi, 'cửa hàng em')
      .replace(/["“'«]Nội Thất["”'»]/gi, 'Nội Thất');

    // 2. Đổi các đoạn **text** thành thẻ <strong>in đậm</strong> đẹp mắt
    const parts = cleanText.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-bold text-primary">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:top-auto md:left-auto md:bottom-6 md:right-6 md:translate-x-0 md:translate-y-0 z-50 w-[92vw] sm:w-[400px] md:w-[420px] max-w-[420px] h-[580px] max-h-[85vh] bg-surface border border-outline/30 shadow-2xl flex flex-col font-sans overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="bg-surface-container-high border-b border-outline/20 p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-primary text-white flex items-center justify-center rounded-none shadow-sm">
            <Sparkles size={18} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface">
                AI Tư Vấn Nội Thất
              </h3>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            </div>
            <p className="text-[11px] text-on-surface-variant">Tư vấn không gian &amp; sản phẩm 24/7</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClearHistory}
            className="p-1.5 text-on-surface-variant hover:text-rose-600 hover:bg-surface-container-highest transition-colors cursor-pointer"
            title="Xóa lịch sử trò chuyện"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
            title="Đóng cửa sổ chat"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-surface-container-lowest">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 shrink-0 flex items-center justify-center text-xs font-bold ${
                msg.role === 'user'
                  ? 'bg-secondary text-on-secondary'
                  : 'bg-primary/10 text-primary border border-primary/20'
              }`}
            >
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[82%] text-xs leading-relaxed p-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface border border-outline/30 text-on-surface shadow-xs'
              }`}
            >
              <div className="whitespace-pre-wrap">{renderFormattedContent(msg.content)}</div>

              {/* Suggested Product Cards */}
              {msg.suggestedProducts && msg.suggestedProducts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-outline/20 space-y-2">
                  <p className="text-[11px] font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
                    <ShoppingBag size={12} /> Sản phẩm gợi ý cho bạn:
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {msg.suggestedProducts.map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => navigate(`/product/${prod.id}`)}
                        className="flex items-center gap-2.5 p-2 bg-surface-container-low hover:bg-surface-container border border-outline/20 cursor-pointer transition-all group"
                      >
                        {prod.image ? (
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-12 h-12 object-cover shrink-0 border border-outline/10"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-surface-container-high flex items-center justify-center text-on-surface-variant text-[10px] shrink-0">
                            N/A
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                            {prod.name}
                          </h4>
                          <p className="text-[11px] font-bold text-primary">
                            {formatPrice(prod.price)}
                          </p>
                        </div>
                        <ExternalLink size={14} className="text-on-surface-variant group-hover:text-primary shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Quick Prompts */}
        {(messages.length <= 2 || showQuickPrompts) && !isLoading && (
          <div className="pt-2.5 pb-2 px-3 bg-surface-container-low border border-outline/20 mb-2">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={12} className="text-primary" /> Gợi ý câu hỏi nhanh:
              </p>
              {messages.length > 2 && (
                <button
                  onClick={() => setShowQuickPrompts(false)}
                  className="text-on-surface-variant hover:text-on-surface p-0.5 transition-colors cursor-pointer"
                  title="Thu gọn gợi ý"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="text-[11px] px-2.5 py-1.5 bg-surface border border-outline/30 text-on-surface hover:border-primary hover:text-primary transition-all text-left cursor-pointer active:scale-95"
                >
                  ✨ {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-2.5 items-center">
            <div className="w-7 h-7 bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Bot size={14} />
            </div>
            <div className="bg-surface border border-outline/30 text-on-surface-variant p-3 text-xs flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin text-primary" />
              <span>AI đang suy nghĩ giải pháp tư vấn tốt nhất...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Footer */}
      <div className="p-3 bg-surface border-t border-outline/20">
        {messages.length > 2 && !isLoading && (
          <div className="flex justify-start mb-2">
            <button
              type="button"
              onClick={() => setShowQuickPrompts(!showQuickPrompts)}
              className={`text-[11px] font-medium flex items-center gap-1 px-2.5 py-1 border transition-all cursor-pointer ${
                showQuickPrompts
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-surface-container-low text-on-surface-variant border-outline/20 hover:border-primary/40 hover:text-primary'
              }`}
            >
              <Sparkles size={12} />
              <span>{showQuickPrompts ? 'Ẩn gợi ý câu hỏi' : '✨ Gợi ý câu hỏi nhanh'}</span>
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hỏi về sản phẩm, tư vấn không gian..."
            disabled={isLoading}
            className="flex-1 bg-surface-container-low border border-outline/30 px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary placeholder:text-on-surface-variant/60 disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputMessage.trim() || isLoading}
            className="w-9 h-9 bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer active:scale-95"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
