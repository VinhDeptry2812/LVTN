import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const AboutFurniturePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-surface font-body-md text-on-surface selection:bg-primary selection:text-on-primary">
      <Header />

      <main className="flex-grow pt-0 pb-24 animate-in fade-in duration-1000">
        {/* Hero Section */}
        <section className="relative h-[60vh] md:h-[80vh] w-full overflow-hidden bg-surface-container-low">
          <img
            src="https://res.cloudinary.com/dblkv5veh/image/upload/v1784331010/thiet-ke-noi-that-du-an-masteri-duplex-apartment-200m2-8_yjkace.jpg"
            alt="Minimalist luxury interior"
            className="w-full h-full object-cover object-center filter brightness-[0.85] transition-transform duration-[2000ms] hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
          <div className="absolute bottom-12 left-0 right-0">
            <div className="max-w-container-max mx-auto px-sp-md md:px-lg text-white">
              <span className="inline-block uppercase tracking-[0.25em] text-xs font-semibold mb-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded">
                Triết lý thiết kế
              </span>
              <h1 className="font-headline-xl text-4xl md:text-6xl font-light tracking-wide leading-tight max-w-3xl">
                Sự tinh tế của không gian sống nằm ở sự giản đơn
              </h1>
            </div>
          </div>
        </section>

        {/* Brand Manifesto Section */}
        <section className="py-20 md:py-28 bg-surface">
          <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16 items-start">
              <div className="lg:col-span-4 lg:sticky lg:top-[120px]">
                <span className="uppercase tracking-[0.2em] text-sm text-primary font-bold block mb-2">
                  Tuyên ngôn
                </span>
                <h2 className="text-3xl md:text-4xl font-headline-lg font-light text-on-surface">
                  Vẻ đẹp độc bản & Bền vững
                </h2>
              </div>
              <div className="lg:col-span-8 space-y-6 text-on-surface-variant font-body-lg text-lg leading-relaxed font-light">
                <p>
                  Chúng tôi tin rằng mỗi món đồ nội thất không chỉ đơn thuần là vật dụng trang trí, mà còn là linh hồn của ngôi nhà, là nơi lưu giữ những khoảnh khắc ấm áp và bình yên của gia đình. Với triết lý
                  <strong className="text-on-surface font-medium"> "Tối giản để cảm nhận nhiều hơn"</strong>, mỗi sản phẩm được chúng tôi chế tác đều loại bỏ những chi tiết thừa thãi, chỉ giữ lại những đường nét tinh túy nhất.
                </p>
                <p>
                  Sử dụng nguồn nguyên liệu tự nhiên được tuyển chọn kỹ lưỡng từ gỗ tràm, gỗ sồi đạt chuẩn bền vững toàn cầu (FSC), chúng tôi cam kết mang lại những sản phẩm không chỉ có tuổi thọ hàng thập kỷ mà còn tuyệt đối an toàn cho sức khỏe và thân thiện với môi trường xung quanh.
                </p>
                <blockquote className="border-l-2 border-primary pl-6 my-8 italic text-on-surface text-xl font-body-lg">
                  "Nội thất không chỉ là những gì bạn nhìn thấy, mà là cách bạn cảm nhận cuộc sống trong không gian đó."
                </blockquote>
              </div>
            </div>
          </div>
        </section>

        {/* Craftsmanship Story - Asymmetric Grid */}
        <section className="py-16 md:py-24 bg-surface-container-lowest">
          <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
            <div className="text-center max-w-2xl mx-auto mb-16 md:mb-24">
              <span className="uppercase tracking-[0.2em] text-sm text-primary font-bold">Hành trình sản xuất</span>
              <h2 className="text-3xl md:text-5xl font-serif font-light mt-2 text-on-surface">Quy trình chế tác thủ công</h2>
              <div className="w-16 h-[2px] bg-primary mx-auto mt-6"></div>
            </div>

            <div className="space-y-24 md:space-y-36">
              {/* Step 1 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center">
                <div className="md:col-span-6 order-2 md:order-1">
                  <span className="font-headline-xl text-5xl md:text-7xl font-extralight text-primary/30 block mb-2">01</span>
                  <h3 className="text-2xl md:text-3xl font-headline-md font-light text-on-surface mb-4">Lựa chọn nguyên liệu thô hảo hạng</h3>
                  <p className="text-on-surface-variant font-light leading-relaxed">
                    Mỗi hành trình bắt đầu từ những khu rừng gỗ bền vững. Chúng tôi trực tiếp khảo sát và lựa chọn từng thân gỗ tràm, gỗ sồi lâu năm đạt tiêu chuẩn về độ đan xen thớ gỗ và độ ẩm tự nhiên hoàn hảo để hạn chế tối đa hiện tượng cong vênh hay mối mọt sau này.
                  </p>
                </div>
                <div className="md:col-span-6 order-1 md:order-2 overflow-hidden aspect-[4/3] bg-surface-container">
                  <img
                    src="https://res.cloudinary.com/dblkv5veh/image/upload/v1784331158/images_aur6bk.jpg"
                    alt="Wood material selection"
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Step 2 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center">
                <div className="md:col-span-6 overflow-hidden aspect-[4/3] bg-surface-container">
                  <img
                    src="https://res.cloudinary.com/dblkv5veh/image/upload/v1784331010/chon-noi-that-phu-hop-voi-khong-gian_nalwjq.jpg"
                    alt="Artisan craftsmanship wood working"
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="md:col-span-6">
                  <span className="font-headline-xl text-5xl md:text-7xl font-extralight text-primary/30 block mb-2">02</span>
                  <h3 className="text-2xl md:text-3xl font-headline-md font-light text-on-surface mb-4">Sự tỉ mỉ của người thợ</h3>
                  <p className="text-on-surface-variant font-light leading-relaxed">
                    Sản phẩm của chúng tôi được hình thành từ sự kết hợp nhịp nhàng giữa máy móc độ chính xác cao và những bàn tay nghệ nhân lâu năm. Từng đường mộng gỗ ghép nối chắc chắn, từng góc cạnh được mài nhẵn thủ công một cách tỉ mỉ mang lại trải nghiệm tinh tế khi chạm vào.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center">
                <div className="md:col-span-6 order-2 md:order-1">
                  <span className="font-headline-xl text-5xl md:text-7xl font-extralight text-primary/30 block mb-2">03</span>
                  <h3 className="text-2xl md:text-3xl font-headline-md font-light text-on-surface mb-4">Hoàn thiện bền vững với môi trường</h3>
                  <p className="text-on-surface-variant font-light leading-relaxed">
                    Chúng tôi phủ lên bề mặt gỗ lớp sơn lau dầu thực vật hoặc sơn bóng gốc nước đạt chứng chỉ an toàn cao nhất của Châu Âu. Quy trình này không chỉ giữ nguyên vẹn vẻ đẹp mộc mạc của các vân gỗ tự nhiên mà còn bảo vệ sản phẩm khỏi các tác động thời tiết và ẩm mốc mà hoàn toàn lành tính với người sử dụng.
                  </p>
                </div>
                <div className="md:col-span-6 order-1 md:order-2 overflow-hidden aspect-[4/3] bg-surface-container">
                  <img
                    src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=1000&auto=format&fit=crop"
                    alt="Finished minimalist furniture product"
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Values Section */}
        <section className="py-20 md:py-28 bg-surface">
          <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
            <h2 className="text-center text-3xl md:text-4xl font-headline-lg font-light text-on-surface mb-16">
              Giá trị cốt lõi làm nên sự khác biệt
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              <div className="border border-outline-variant p-8 md:p-10 hover:border-primary transition-colors duration-500 rounded-lg group">
                <span className="material-symbols-outlined text-4xl text-primary mb-6 block transition-transform group-hover:-translate-y-1">
                  eco
                </span>
                <h4 className="text-xl font-headline-md font-light text-on-surface mb-3">Phát triển bền vững</h4>
                <p className="text-on-surface-variant text-sm font-light leading-relaxed">
                  Cam kết 100% gỗ có chứng chỉ khai thác bền vững rõ ràng. Trồng lại rừng, giảm thiểu phát thải và sử dụng bao bì tái chế để bảo vệ hành tinh xanh.
                </p>
              </div>

              <div className="border border-outline-variant p-8 md:p-10 hover:border-primary transition-colors duration-500 rounded-lg group">
                <span className="material-symbols-outlined text-4xl text-primary mb-6 block transition-transform group-hover:-translate-y-1">
                  architecture
                </span>
                <h4 className="text-xl font-headline-md font-light text-on-surface mb-3">Tối giản công năng</h4>
                <p className="text-on-surface-variant text-sm font-light leading-relaxed">
                  Thiết kế tập trung vào sự tiện dụng và đa năng trong không gian sống hiện đại. Vẻ đẹp không nằm ở sự phô trương mà ở sự hài hòa với cuộc sống hằng ngày.
                </p>
              </div>

              <div className="border border-outline-variant p-8 md:p-10 hover:border-primary transition-colors duration-500 rounded-lg group">
                <span className="material-symbols-outlined text-4xl text-primary mb-6 block transition-transform group-hover:-translate-y-1">
                  workspace_premium
                </span>
                <h4 className="text-xl font-headline-md font-light text-on-surface mb-3">Chất lượng độc bản</h4>
                <p className="text-on-surface-variant text-sm font-light leading-relaxed">
                  Mỗi vân gỗ, mỗi mối mộng nối đều là độc nhất. Chúng tôi trân trọng tính nguyên bản của chất liệu và mang lại một tác phẩm nghệ thuật riêng biệt cho tổ ấm của bạn.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutFurniturePage;
