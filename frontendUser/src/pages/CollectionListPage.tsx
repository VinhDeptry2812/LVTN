import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getActiveCollections, type Collection } from '@/services/collection.service';
import { heroBannerImage } from '@/utils/cloudinaryUrl';

const CollectionListPage: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    getActiveCollections()
      .then((data) => {
        setCollections(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-surface font-sans text-on-surface selection:bg-primary selection:text-on-primary">
      <Header />

      <main className="flex-grow pt-[100px] md:pt-[120px] pb-20 animate-in fade-in duration-700">
        <div className="max-w-container-max mx-auto px-sp-md md:px-lg text-center mb-16">
           <h1 className="font-headline-xl text-3xl md:text-5xl text-on-surface font-medium mb-4">
             Nội thất đẹp cho không gian sống
           </h1>
           <p className="text-on-surface-variant font-body-lg text-lg">
             Khám phá bộ sưu tập mới nhất từ thương hiệu
           </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-20 text-on-surface-variant font-body-lg">
            Chưa có bộ sưu tập nào.
          </div>
        ) : (
          <div className="collections-grid max-w-container-max mx-auto px-sp-md md:px-lg grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12 md:gap-y-16">
            {collections.map(col => (
              <Link key={col.id} to={`/collection/${col.slug}`} className="collection-card group block">
                <div className="relative aspect-[16/10] md:aspect-[4/3] overflow-hidden bg-surface-container-low mb-6">
                  <img 
                    src={heroBannerImage(col.cover_image) || 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=1200&auto=format&fit=crop'} 
                    alt={col.name} 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Overlay mờ nhẹ */}
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors duration-500"></div>
                </div>
                <div className="text-center md:text-left">
                  <h2 className="font-headline-md text-2xl text-on-surface mb-3 group-hover:text-primary transition-colors">
                    {col.name.toLowerCase().includes('phòng') ? 'Không gian' : 'Bộ sưu tập'} {col.name}
                  </h2>
                  <p className="font-body-md text-on-surface-variant line-clamp-3 md:line-clamp-2">
                    {col.description || `Khám phá các thiết kế mang tinh thần ${col.name} cho không gian sống của bạn.`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CollectionListPage;
