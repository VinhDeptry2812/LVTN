import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ShoppingBag, ArrowLeft } from 'lucide-react';

interface PaymentResult {
  success: boolean;
  message: string;
  orderId?: number;
  transactionNo?: string;
  responseCode?: string;
}

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Chuyển tất cả query params thành object gửi lên backend xác thực
        const params = Object.fromEntries(searchParams.entries());
        const queryString = new URLSearchParams(params).toString();

        const endpoint = `http://localhost:3000/payment/vnpay-return?${queryString}`;

        const response = await fetch(endpoint);
        const data = await response.json();
        setResult(data);
      } catch {
        setResult({
          success: false,
          message: 'Không thể kết nối đến máy chủ để xác thực thanh toán.',
        });
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <Loader2 size={64} style={styles.spinner} color="#6366f1" />
          <h2 style={styles.title}>Đang xác thực thanh toán...</h2>
          <p style={styles.subtitle}>Vui lòng chờ trong giây lát</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {result?.success ? (
          <>
            <div style={styles.iconWrapperSuccess}>
              <CheckCircle size={72} color="#A5A58D" strokeWidth={1.5} />
            </div>
            <h2 style={{ ...styles.title }}>
              Đặt hàng thành công!
            </h2>
            <p style={styles.subtitle}>{result.message}</p>

            <div style={styles.infoBox}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Mã đơn hàng:</span>
                <span style={styles.infoValue}>#{result.orderId}</span>
              </div>
              {result.transactionNo && (
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>
                    Mã giao dịch VNPAY:
                  </span>
                  <span style={styles.infoValue}>{result.transactionNo}</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div style={styles.iconWrapperFailed}>
              <XCircle size={72} color="#ff4d4f" strokeWidth={1.5} />
            </div>
            <h2 style={{ ...styles.title, color: '#ff4d4f' }}>
              Thanh toán thất bại
            </h2>
            <p style={styles.subtitle}>
              {result?.message || 'Đã xảy ra lỗi trong quá trình thanh toán.'}
            </p>
            {result?.responseCode && (
              <p style={styles.errorCode}>
                Mã lỗi: {result.responseCode}
              </p>
            )}
          </>
        )}

        <div style={styles.buttonGroup}>
          <button
            onClick={() => navigate('/admin')}
            style={styles.primaryButton}
          >
            <ShoppingBag size={18} />
            Về trang chủ
          </button>
          <button
            onClick={() => navigate(-1)}
            style={styles.secondaryButton}
          >
            <ArrowLeft size={18} />
            Quay lại
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8f9fa',
    padding: '20px',
    fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '48px 40px',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center' as const,
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: '1px solid #d9d9d9',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
    margin: '0 auto 24px',
  },
  iconWrapperSuccess: {
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'center',
  },
  iconWrapperFailed: {
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 500,
    marginBottom: '8px',
    color: '#333',
  },
  subtitle: {
    fontSize: '14px',
    color: '#737373',
    marginBottom: '24px',
    lineHeight: 1.5,
  },
  infoBox: {
    background: '#f8f9fa',
    border: '1px solid #d9d9d9',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    textAlign: 'left' as const,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
  },
  infoLabel: {
    fontSize: '14px',
    color: '#737373',
  },
  infoValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#333',
  },
  errorCode: {
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '24px',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    justifyContent: 'center',
    marginTop: '24px',
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px 24px',
    background: '#A5A58D',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px 24px',
    background: 'transparent',
    color: '#A5A58D',
    border: '1px solid #A5A58D',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s, color 0.2s',
  },
};
