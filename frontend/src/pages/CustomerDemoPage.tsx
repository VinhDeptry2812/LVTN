import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Package, CreditCard, Plus, Minus, Trash2, ArrowRight, ArrowLeft, CheckCircle, Store } from 'lucide-react';

const API = 'http://localhost:3000';

// Helper lấy token từ localStorage
const getToken = () => localStorage.getItem('token') || '';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

interface ProductImage { id: number; url: string; is_primary: boolean; }
interface Variant { id: number; sku: string; attributes: Record<string, string>; price_adjustment: number; stock: number; }
interface Product { id: number; name: string; base_price: number; images: ProductImage[]; variants: Variant[]; }
interface CartItemData { id: number; quantity: number; product: Product; variant: Variant | null; }
interface CartData { id: number; items: CartItemData[]; }

export default function CustomerDemoPage() {
  const [step, setStep] = useState<'products' | 'cart' | 'checkout'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // Checkout form
  const [address, setAddress] = useState('123 Nguyễn Huệ, Quận 1, TP.HCM');
  const [phone, setPhone] = useState('0901234567');
  const [notes, setNotes] = useState('');
  const [payMethod, setPayMethod] = useState<'cod' | 'vnpay' | 'momo'>('cod');

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/products`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : data.data || []);
    } catch { setProducts([]); }
  }, []);

  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch(`${API}/cart`, { headers: authHeaders() });
      if (res.ok) setCart(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchProducts(); fetchCart(); }, [fetchProducts, fetchCart]);

  const addToCart = async (productId: number, variantId?: number) => {
    setLoading(true); setMsg('');
    try {
      const body: any = { product_id: productId, quantity: 1 };
      if (variantId) body.product_variant_id = variantId;
      const res = await fetch(`${API}/cart/items`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
      if (res.ok) { setCart(await res.json()); setMsg('Đã thêm vào giỏ hàng!'); setTimeout(() => setMsg(''), 2000); }
      else { const e = await res.json(); setMsg(e.message || 'Lỗi'); }
    } catch { setMsg('Lỗi kết nối'); }
    setLoading(false);
  };

  const updateQty = async (itemId: number, qty: number) => {
    if (qty < 1) return removeItem(itemId);
    try {
      const res = await fetch(`${API}/cart/items/${itemId}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ quantity: qty }) });
      if (res.ok) setCart(await res.json());
    } catch { /* ignore */ }
  };

  const removeItem = async (itemId: number) => {
    try {
      const res = await fetch(`${API}/cart/items/${itemId}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) setCart(await res.json());
    } catch { /* ignore */ }
  };

  const placeOrder = async () => {
    setLoading(true); setMsg('');
    try {
      const res = await fetch(`${API}/orders`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ shipping_address: address, phone, notes, payment_method: payMethod }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl; // Redirect tới VNPAY hoặc MoMo
        } else {
          setMsg(`Đặt hàng COD thành công! Mã đơn #${data.order?.id}`);
          setCart(null); fetchCart();
        }
      } else { setMsg(data.message || 'Lỗi đặt hàng'); }
    } catch { setMsg('Lỗi kết nối'); }
    setLoading(false);
  };

  const cartTotal = cart?.items.reduce((sum, i) => {
    const price = Number(i.product.base_price) + (i.variant ? Number(i.variant.price_adjustment) : 0);
    return sum + price * i.quantity;
  }, 0) || 0;

  const cartCount = cart?.items.reduce((s, i) => s + i.quantity, 0) || 0;

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}><Store size={24}/> FurniShop Demo</h1>
        <button onClick={() => { setStep('cart'); fetchCart(); }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <ShoppingCart size={18}/> Giỏ hàng ({cartCount})
        </button>
      </header>

      {/* Steps */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '20px 0', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        {[
          { key: 'products' as const, icon: <Package size={16}/>, label: 'Sản phẩm' },
          { key: 'cart' as const, icon: <ShoppingCart size={16}/>, label: 'Giỏ hàng' },
          { key: 'checkout' as const, icon: <CreditCard size={16}/>, label: 'Thanh toán' },
        ].map((s, i) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => { setStep(s.key); if (s.key !== 'products') fetchCart(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer',
                background: step === s.key ? '#6366f1' : '#f1f5f9', color: step === s.key ? '#fff' : '#64748b', fontWeight: 600, fontSize: 13 }}>
              {s.icon} {s.label}
            </button>
            {i < 2 && <ArrowRight size={14} color="#cbd5e1"/>}
          </div>
        ))}
      </div>

      {/* Toast */}
      {msg && <div style={{ position: 'fixed', top: 20, right: 20, background: msg.includes('thành công') || msg.includes('Đã thêm') ? '#22c55e' : '#ef4444', color: '#fff', padding: '12px 24px', borderRadius: 10, zIndex: 999, fontSize: 14, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>{msg}</div>}

      <div style={{ maxWidth: 1100, margin: '24px auto', padding: '0 16px' }}>
        {/* PRODUCTS TAB */}
        {step === 'products' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {products.map(p => {
              const img = p.images?.find(i => i.is_primary)?.url || p.images?.[0]?.url || '';
              return (
                <div key={p.id} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', transition: 'transform .2s' }}>
                  {img && <img src={img} alt={p.name} style={{ width: '100%', height: 200, objectFit: 'cover' }}/>}
                  <div style={{ padding: 16 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px', color: '#1e293b' }}>{p.name}</h3>
                    <p style={{ color: '#6366f1', fontWeight: 700, fontSize: 16, margin: '0 0 12px' }}>{fmt(Number(p.base_price))}</p>
                    {p.variants?.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {p.variants.map(v => (
                          <button key={v.id} onClick={() => addToCart(p.id, v.id)} disabled={loading || v.stock < 1}
                            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: v.stock < 1 ? '#f1f5f9' : '#fff', cursor: v.stock < 1 ? 'not-allowed' : 'pointer', fontSize: 12, color: v.stock < 1 ? '#94a3b8' : '#334155' }}>
                            <Plus size={12}/> {Object.values(v.attributes).join(' / ')}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button onClick={() => addToCart(p.id)} disabled={loading}
                        style={{ width: '100%', padding: '10px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Plus size={16}/> Thêm vào giỏ
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {products.length === 0 && <p style={{ color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>Chưa có sản phẩm nào.</p>}
          </div>
        )}

        {/* CART TAB */}
        {step === 'cart' && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: '#1e293b' }}>🛒 Giỏ hàng của bạn</h2>
            {!cart?.items.length ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                <ShoppingCart size={48} style={{ margin: '0 auto 12px', display: 'block' }}/>
                <p>Giỏ hàng trống</p>
                <button onClick={() => setStep('products')} style={{ marginTop: 12, padding: '10px 24px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                  <ArrowLeft size={14}/> Tiếp tục mua sắm
                </button>
              </div>
            ) : (
              <>
                {cart.items.map(item => {
                  const price = Number(item.product.base_price) + (item.variant ? Number(item.variant.price_adjustment) : 0);
                  const img = item.product.images?.find(i => i.is_primary)?.url || item.product.images?.[0]?.url || '';
                  return (
                    <div key={item.id} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                      {img && <img src={img} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover' }}/>}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, color: '#1e293b', margin: 0 }}>{item.product.name}</p>
                        {item.variant && <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>{Object.values(item.variant.attributes).join(' / ')}</p>}
                        <p style={{ color: '#6366f1', fontWeight: 700, margin: '4px 0 0' }}>{fmt(price)}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => updateQty(item.id, item.quantity - 1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={14}/></button>
                        <span style={{ fontWeight: 600, minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, item.quantity + 1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={14}/></button>
                      </div>
                      <p style={{ fontWeight: 700, color: '#1e293b', minWidth: 100, textAlign: 'right' }}>{fmt(price * item.quantity)}</p>
                      <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={18}/></button>
                    </div>
                  );
                })}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTop: '2px solid #e2e8f0' }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Tổng cộng: {fmt(cartTotal)}</span>
                  <button onClick={() => setStep('checkout')} style={{ padding: '12px 28px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                    Tiến hành thanh toán <ArrowRight size={18}/>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* CHECKOUT TAB */}
        {step === 'checkout' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: '#1e293b' }}>📦 Thông tin giao hàng</h2>
              <label style={labelStyle}>Địa chỉ nhận hàng *</label>
              <input value={address} onChange={e => setAddress(e.target.value)} style={inputStyle}/>
              <label style={labelStyle}>Số điện thoại *</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle}/>
              <label style={labelStyle}>Ghi chú</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }}/>

              <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 24, marginBottom: 12, color: '#1e293b' }}>💳 Phương thức thanh toán</h3>
              {[
                { val: 'cod' as const, label: 'Thanh toán khi nhận hàng (COD)', desc: 'Trả tiền mặt khi giao hàng' },
                { val: 'vnpay' as const, label: 'Thanh toán VNPAY', desc: 'Thẻ ATM / Thẻ quốc tế / QR Pay (VNPAY Sandbox)' },
                { val: 'momo' as const, label: 'Thanh toán ví điện tử MoMo', desc: 'Ứng dụng MoMo (Sandbox)' },
              ].map(m => (
                <div key={m.val} onClick={() => setPayMethod(m.val)}
                  style={{ padding: 16, border: payMethod === m.val ? '2px solid #6366f1' : '1px solid #e2e8f0', borderRadius: 12, marginBottom: 10, cursor: 'pointer', background: payMethod === m.val ? '#eef2ff' : '#fff', transition: 'all .2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: payMethod === m.val ? '6px solid #6366f1' : '2px solid #cbd5e1' }}/>
                    <div>
                      <p style={{ fontWeight: 600, margin: 0, color: '#1e293b', fontSize: 14 }}>{m.label}</p>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{m.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: 'fit-content', position: 'sticky', top: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1e293b' }}>📋 Tóm tắt đơn hàng</h3>
              {cart?.items.map(item => {
                const price = Number(item.product.base_price) + (item.variant ? Number(item.variant.price_adjustment) : 0);
                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                    <span style={{ color: '#475569' }}>{item.product.name} x{item.quantity}</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{fmt(price * item.quantity)}</span>
                  </div>
                );
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: '2px solid #e2e8f0' }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Tổng cộng</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#6366f1' }}>{fmt(cartTotal)}</span>
              </div>
              <button onClick={placeOrder} disabled={loading || !cart?.items.length}
                style={{ width: '100%', marginTop: 20, padding: '14px', background: loading ? '#94a3b8' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? 'Đang xử lý...' : <><CheckCircle size={18}/> {payMethod === 'vnpay' ? 'Thanh toán VNPAY' : payMethod === 'momo' ? 'Thanh toán MoMo' : 'Đặt hàng COD'}</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6, marginTop: 14 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
