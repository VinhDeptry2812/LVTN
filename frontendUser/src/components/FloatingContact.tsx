import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, X, ArrowUp, Sparkles } from 'lucide-react';
import AIChatbot from './AIChatbot';

export default function FloatingContact() {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [isAiChatOpen, setIsAiChatOpen] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const phoneNumber = '0703201511'; // Số điện thoại hotline & Zalo của shop

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Không hiển thị trên trang thanh toán
    if (location.pathname === '/checkout') {
        return null;
    }

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <>
            {/* AI Chatbot Window */}
            <AIChatbot isOpen={isAiChatOpen} onClose={() => setIsAiChatOpen(false)} />

            {/* Chỉ hiển thị cụm nút liên hệ khi KHÔNG mở khung Chat AI */}
            {!isAiChatOpen && (
                <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-3 font-sans">
                    {/* Scroll Up Button */}
                    {showScrollTop && (
                        <div className="flex items-center gap-3 group animate-fadeIn">
                            <span className="bg-surface text-on-surface text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 border border-outline/30 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none select-none rounded-none whitespace-nowrap">
                                Về đầu trang
                            </span>
                            <button
                                onClick={scrollToTop}
                                aria-label="Cuộn lên đầu trang"
                                className="w-14 h-14 bg-surface border border-outline/30 text-on-surface flex items-center justify-center shadow-lg hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 cursor-pointer rounded-none active:scale-95"
                            >
                                <ArrowUp size={20} />
                            </button>
                        </div>
                    )}

                    {/* Submenus (Liên kết phụ xuất hiện khi mở) */}
                    {isOpen && (
                        <div className="flex flex-col items-end gap-2 animate-fadeIn duration-200">
                            {/* AI Chatbot Button */}
                            <button
                                onClick={() => {
                                    setIsAiChatOpen(true);
                                    setIsOpen(false);
                                }}
                                className="flex items-center justify-between gap-3 px-4 py-2.5 bg-surface border border-outline/30 hover:bg-surface-container-low text-on-surface shadow-md transition-all duration-300 rounded-none cursor-pointer group w-60"
                            >
                                <span className="text-xs font-bold uppercase tracking-wider text-[10px]">
                                    AI Tư Vấn Nội Thất
                                </span>
                                <div className="w-8 h-8 bg-emerald-600/10 text-emerald-600 flex items-center justify-center rounded-none group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shrink-0">
                                    <Sparkles className="w-4.5 h-4.5 animate-pulse" />
                                </div>
                            </button>

                            {/* Zalo */}
                            <a
                                href={`https://zalo.me/${phoneNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between gap-3 px-4 py-2.5 bg-surface border border-outline/30 hover:bg-surface-container-low text-on-surface shadow-md transition-all duration-300 rounded-none cursor-pointer group w-60"
                            >
                                <span className="text-xs font-bold uppercase tracking-wider text-[10px] group-hover:text-white transition-colors">
                                    Chat qua Zalo
                                </span>
                                <div className="w-8 h-8 bg-blue-600/10 text-blue-600 flex items-center justify-center rounded-none group-hover:bg-[#0068FF] group-hover:text-white transition-all duration-300 shrink-0">
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9436 0 1.0746.8697 1.9453 1.945 1.9453z" />
                                    </svg>
                                </div>
                            </a>

                            {/* Messenger */}
                            <a
                                href="https://www.facebook.com/vinh.nguyen.98055"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between gap-3 px-4 py-2.5 bg-surface border border-outline/30 hover:bg-surface-container-low text-on-surface shadow-md transition-all duration-300 rounded-none cursor-pointer group w-60"
                            >
                                <span className="text-xs font-bold uppercase tracking-wider text-[10px] group-hover:text-white transition-colors">
                                    Chat qua Messenger
                                </span>
                                <div className="w-8 h-8 bg-indigo-600/10 text-indigo-600 flex items-center justify-center rounded-none group-hover:bg-[#0084FF] group-hover:text-white transition-all duration-300 shrink-0">
                                    <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 0C5.24 0 0 4.952 0 11.64c0 3.499 1.434 6.521 3.769 8.61a.96.96 0 0 1 .323.683l.065 2.135a.96.96 0 0 0 1.347.85l2.381-1.053a.96.96 0 0 1 .641-.046A13 13 0 0 0 12 23.28c6.76 0 12-4.952 12-11.64S18.76 0 12 0m6.806 7.44c.522-.03.971.567.63 1.094l-4.178 6.457a.707.707 0 0 1-.977.208l-3.87-2.504a.44.44 0 0 0-.49.007l-4.363 3.01c-.637.438-1.415-.317-.995-.966l4.179-6.457a.706.706 0 0 1 .977-.21l3.87 2.505c.15.097.344.094.491-.007l4.362-3.008a.7.7 0 0 1 .364-.13" />
                                    </svg>
                                </div>
                            </a>
                        </div>
                    )}

                    {/* Main Toggle Button */}
                    <div className="flex items-center gap-3 group">
                        {/* Hover Label (Chỉ xuất hiện khi nút đóng) */}
                        {!isOpen && (
                            <span className="bg-surface text-on-surface text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 border border-outline/30 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none select-none rounded-none">
                                Tư vấn &amp; Hỗ trợ
                            </span>
                        )}

                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className={`w-14 h-14 flex items-center justify-center shadow-xl border border-primary-container text-white transition-all duration-300 cursor-pointer rounded-none active:scale-95 ${isOpen
                                ? 'bg-inverse-surface hover:bg-inverse-surface/90 rotate-90'
                                : 'bg-primary hover:bg-primary/95 animate-pulse-slow'
                                }`}
                        >
                            {isOpen ? <X size={20} /> : <MessageSquare size={20} />}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

