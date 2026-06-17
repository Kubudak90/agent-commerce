# Agent Commerce — Yol Haritası (Türkçe)

Ajan ödeme rayının şimdiye kadar nasıl inşa edildiği ve bundan sonra nereye gittiği.
Sistemin ne olduğu ve nasıl çalıştığı için [LITEPAPER.tr.md](./LITEPAPER.tr.md)'ye bakın.

> *İngilizce sürüm: [ROADMAP.md](./ROADMAP.md).*

**Gösterim:** ✅ tamamlandı & doğrulandı · 🟡 devam ediyor · ⏭️ sıradaki · 🔭 sonra

> **Dürüst durum (testnet).** Tüm gelen → mutabakat → talep/iade → giden döngüsü canlı ve
> kaynak zincir olarak **Base Sepolia** ile **Arc Testnet** üzerinde uçtan uca
> çalıştırıldı. Ürün **henüz mainnet'te değil**. Aşağıdaki gelecek aşamalar sabit tarih
> taşımaz ve niyetin ötesinde bir taahhüt içermez.

---

## ✅ Aşama 0 — Çekirdek & araçlar

- `@arcora/sdk` — Arcorapay genel API'si için tip-güvenli istemci (fatura oluştur, durum, webhook).
- `@arcora/agent-commerce-core` — `Commerce`: katalog, fatura oluşturma, durum eşleme.
- `@arcora/agent-commerce-mcp` — `list_catalog`, `create_invoice`, `get_checkout_status` araçlarını sunan MCP stdio sunucusu.
- Canlı ArcFXGateway'e karşı merchant onboarding (merchant kaydı + kapsamı sınırlı delege).
- Uçtan uca ajan → fatura akışını kanıtlayan bir sohbet-vitrini demosu.

## ✅ Aşama 1 — Tek-komut dağıtım

- `@arcora/agent-commerce` CLI: `onboard` (cüzdan → kayıtlı merchant → API anahtarı + MCP yapılandırması) ve `serve` (MCP sunucusunu çalıştır).
- core + mcp + sdk'yı içine gömen tek bir paketlenmiş ikili; tüketiciler için workspace tesisatı yok.
- npm'e yayınlandı (MIT), temiz bir registry kurulumuyla bağımsız doğrulandı.

## ✅ Aşama 2 — Zincirler arası gelen (başka zincirden ödeme)

- **Base Sepolia**'daki bir alıcı USDC öder; ödeme **CCTP** ile Arc'a köprülenir
  (yak → IRIS attestation → bas) ve emanete oturur.
- Relayer tarafından otomatik sürülür; ajan yalnızca tek bir fatura oluşturur.
- Gerçek bir testnet ödemesiyle uçtan uca kanıtlandı.

## ✅ Aşama 3 — Payout-chain, iadeler & açık kaynak

- **Payout-chain (giden geçiş):** `onboard --payout-chain <id> --payout-address <0x…>`
  bir merchant'ın gelirini seçtiği zincirde almasını sağlar; relayer CCTP ile
  Arc → hedefe köprüler.
- **İadeler:** `refund_invoice` MCP aracı + `refund` CLI komutu + core'da `createRefunder`;
  emanetteki USDC'yi zincir-üstü iade penceresi içinde orijinal ödeyene döndürür.
- Ayrı bir `refunded` ödeme durumu (artık `failed`'e gömülmüyor).
- Yeşil CI'lı (her push'ta build + test) açık kaynak depo ve etiketli bir sürüm.

## ⏭️ Aşama 4 — Mainnet

Sıradaki kilometre taşı: rayı testnet'ten üretime taşımak.

- ArcFXGateway'i **Arc mainnet**'e deploy et ve doğrula; adres kayıt defterini yayınla.
- **Mainnet CCTP V2** domain/adreslerine ve üretim attestation servisine geç.
- **Gerçek USDC** ile mutabakat; relayer'ı mainnet için fonla ve sağlamlaştır (gas,
  izleme, alarm, yeniden deneme).
- Üretim sağlamlaştırması: hız sınırları, gözlemlenebilirlik, olay runbook'ları, anahtar yönetimi.

## ⏭️ Aşama 5 — Sıfır-friction onboarding (sponsorlu gas)

- Bir **paymaster**, zincir-üstü onboarding işlemlerini (merchant kaydı + delege
  yetkilendirmesi) sponsorlar; böylece bir operatör, kendi gas'ı **olmadan** bir ajanı
  onboard edebilir — ölçekte gerçek tek-komut kurulum.

## 🔭 Aşama 6 — Daha fazla zincir

- Gelen ödemeler için ek **kaynak zincirler** (örn. Ethereum, Arbitrum, Optimism,
  Polygon ve Solana), CCTP kapsamı el verdikçe.
- Giden mutabakat için ek **payout zincirleri**.

## 🔭 Aşama 7 — Daha zengin ticaret

- Sabit liste yerine dinamik / merchant-bazlı kataloglar.
- Abonelikler, sayaçlı ve kullanım-bazlı faturalandırma — ajan-ajan ticareti için doğal uyumlar.
- Çok kalemli sepetler ve paket faturalar.
- Bir ajanın abone olabileceği birinci sınıf webhook'lar/olaylar (paid, refunded, expired).

## 🔭 Aşama 8 — Ekosistem

- Yükselen **ajan-ödeme standartlarıyla** (örn. x402 ailesi) birlikte çalışabilirlik;
  böylece ajanlar hem ödeme *alabilir* hem *yapabilir*.
- Keşif: ajan merchant'larını ve kataloglarını listeleme.
- Ajan merchant'lar için itibar ve analitik.

---

*Bu yol haritası mevcut niyeti yansıtır ve evrilecektir. Bir taahhüt ya da finansal vaat
değildir ve projenin token'ı yoktur.*
