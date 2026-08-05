export enum WarrantyStatus {
  ACTIVE = 'active', // Còn hạn bảo hành
  EXPIRED = 'expired', // Đã hết hạn bảo hành
  VOIDED = 'voided', // Từ chối / Hủy bảo hành
}

export enum ClaimStatus {
  NONE = 'none', // Bình thường (chưa có yêu cầu)
  CLAIMING = 'claiming', // Khách hàng gửi yêu cầu bảo hành/sửa chữa
  PROCESSING = 'processing', // Kỹ thuật đang tiếp nhận & xử lý
  COMPLETED = 'completed', // Đã bảo hành/sửa chữa/đổi mới xong đợt này
  REJECTED = 'rejected', // Từ chối đợt yêu cầu bảo hành này
}
