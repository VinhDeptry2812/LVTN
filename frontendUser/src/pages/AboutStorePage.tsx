import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import toast from 'react-hot-toast';

interface ContactFormData {
  fullName: string;
  phone: string;
  email: string;
  showroom: string;
  date: string;
  message: string;
}

const AboutStorePage: React.FC = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    fullName: '',
    phone: '',
    email: '',
    showroom: 'HCM',
    date: '',
    message: ''
  });

  const [loading, setLoading] = useState<boolean>(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone || !formData.email) {
      toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    setLoading(true);
    // Giả lập gửi form tư vấn
    setTimeout(() => {
      toast.success('Gửi yêu cầu tư vấn thành công! Chúng tôi sẽ liên hệ lại sớm nhất.');
      setFormData({
        fullName: '',
        phone: '',
        email: '',
        showroom: 'HCM',
        date: '',
        message: ''
      });
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface font-body-md text-on-surface selection:bg-primary selection:text-on-primary">
      <Header />

      <main className="flex-grow pt-[80px] md:pt-[100px] pb-24 animate-in fade-in duration-1000">
        {/* Hero Section */}
        <section className="relative h-[50vh] md:h-[65vh] w-full overflow-hidden bg-surface-container-low">
          <img
            src="https://res.cloudinary.com/dblkv5veh/image/upload/v1784331272/vat-lieu-composite-trong-noi-that_ekszkz.jpg"
            alt="Showroom Space Interior"
            className="w-full h-full object-cover object-center filter brightness-95"
          />
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute inset-0 flex items-center justify-center text-center">
            <div className="max-w-container-max mx-auto px-sp-md md:px-lg text-white">
              <span className="uppercase tracking-[0.25em] text-xs font-semibold mb-3 inline-block">
                Hệ thống showroom
              </span>
              <h1 className="font-headline-xl text-4xl md:text-6xl font-light tracking-wide mb-4">
                Chạm để Cảm Nhận
              </h1>
              <p className="max-w-xl mx-auto text-sm md:text-base text-white/90 font-light leading-relaxed">
                Nơi bạn có thể trực tiếp trải nghiệm sự êm ái, những đường vân gỗ tự nhiên độc bản và tinh thần thiết kế tối giản trong từng không gian trưng bày.
              </p>
            </div>
          </div>
        </section>

        {/* Showrooms Network */}
        <section className="py-20 md:py-28 bg-surface">
          <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
            <div className="text-center max-w-2xl mx-auto mb-16 md:mb-24">
              <span className="uppercase tracking-[0.2em] text-sm text-primary font-bold">Tìm cửa hàng gần nhất</span>
              <h2 className="text-3xl md:text-5xl font-headline-xl font-light mt-2 text-on-surface">Không gian trưng bày</h2>
              <div className="w-16 h-[2px] bg-primary mx-auto mt-6"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Bản đồ bên trái (Chiếm 7 cột trên màn hình lớn) */}
              <div className="lg:col-span-7 overflow-hidden aspect-[16/10] bg-surface-container rounded-lg border border-outline-variant/30 shadow-sm">
                <iframe
                  title="Bản đồ Showroom Hồ Chí Minh"
                  src="https://maps.google.com/maps?q=180%20Cao%20L%E1%BB%97,%20Ph%C6%B0%E1%BB%9Dng%204,%20Qu%E1%BA%ADn%208,%20TP.%20H%E1%BB%93%20Ch%C3%AD%20Minh&t=&z=16&ie=UTF8&iwloc=&output=embed"
                  className="w-full h-full border-0 grayscale hover:grayscale-0 transition-all duration-500"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              {/* Thông tin liên hệ bên phải (Chiếm 5 cột trên màn hình lớn) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="space-y-3">
                  <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary border border-primary/30 px-2 py-0.5 rounded">
                    Trụ sở chính
                  </span>
                  <h3 className="text-3xl font-headline-lg font-light text-on-surface">Showroom Hồ Chí Minh</h3>
                  <div className="space-y-4 text-on-surface-variant font-light text-base">
                    <p className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary text-2xl mt-0.5">location_on</span>
                      <span className="leading-relaxed">180 Cao Lỗ, Phường 4, Quận 8, TP. Hồ Chí Minh</span>
                    </p>
                    <p className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-2xl">call</span>
                      <span>0703201511</span>
                    </p>
                    <p className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-2xl">schedule</span>
                      <span>09:00 - 21:00 (Tất cả các ngày trong tuần)</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutStorePage;
