import React from 'react';
import { X, MapPin, Check } from 'lucide-react';
import type { AddressData } from '@/services/address.service';

interface SavedAddressModalProps {
  showAddressModal: boolean;
  setShowAddressModal: (val: boolean) => void;
  isLoadingAddresses: boolean;
  savedAddresses: AddressData[];
  handleSelectSavedAddress: (addr: AddressData) => void;
}

export const SavedAddressModal: React.FC<SavedAddressModalProps> = ({
  showAddressModal,
  setShowAddressModal,
  isLoadingAddresses,
  savedAddresses,
  handleSelectSavedAddress,
}) => {
  if (!showAddressModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-100 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
          <h3 className="text-lg font-serif font-medium text-stone-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-700" />
            Chọn địa chỉ giao hàng
          </h3>
          <button
            type="button"
            onClick={() => setShowAddressModal(false)}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-3 pr-1 flex-1">
          {isLoadingAddresses ? (
            <div className="text-center py-8 text-stone-500 text-sm">
              Đang tải danh sách địa chỉ...
            </div>
          ) : savedAddresses.length === 0 ? (
            <div className="text-center py-8 text-stone-500 text-sm">
              Bạn chưa lưu địa chỉ nào trong sổ địa chỉ.
            </div>
          ) : (
            savedAddresses.map((addr) => (
              <div
                key={addr.id}
                onClick={() => handleSelectSavedAddress(addr)}
                className="p-4 rounded-xl border border-stone-200 hover:border-amber-700/60 hover:bg-amber-50/40 cursor-pointer transition-all group relative"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-900 text-sm">{addr.name}</span>
                      <span className="text-stone-400 text-xs">•</span>
                      <span className="text-stone-600 text-sm">{addr.phone}</span>
                      {addr.is_default && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                          Mặc định
                        </span>
                      )}
                    </div>
                    <p className="text-stone-600 text-xs leading-relaxed">
                      {addr.detail ? `${addr.detail}, ` : ''}
                      {addr.ward_name ? `${addr.ward_name}, ` : ''}
                      {addr.province_name}
                    </p>
                  </div>

                  <div className="w-5 h-5 rounded-full border border-stone-300 group-hover:border-amber-700 group-hover:bg-amber-700 flex items-center justify-center text-white transition-all shrink-0 mt-0.5">
                    <Check className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-4 border-t border-stone-100 mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => setShowAddressModal(false)}
            className="px-4 py-2 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
