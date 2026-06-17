# Agent Commerce — Litepaper (Türkçe)

**Yapay zekâ ajanları için bir ödeme rayı.** Herhangi bir AI ajanını bir *merchant*
(satıcı) hâline getirir: ajan bir katalogdan satış yapar, USDC cinsinden fatura keser,
zincirler arası ödeme alır ve iade edebilir — hepsi programatik, döngüde insan olmadan.

> **Durum: Testnet.** Burada anlatılan her şey bugün Arc Testnet üzerinde çalışıyor
> (Base Sepolia'dan zincirler arası ödeme dahil). Mainnet bir sonraki aşama —
> [ROADMAP.tr.md](./ROADMAP.tr.md). Bu belge *canlı* olanı *planlanan*dan ayırır;
> hiçbir ifade finansal bir vaat değildir ve **token yoktur**.

> *İngilizce sürüm: [LITEPAPER.md](./LITEPAPER.md) (otoriter/birincil sürüm).*

---

## 1. Sorun: ajanlar satabiliyor ama tahsilat yapamıyor

AI ajanları artık gerçekten *ticaret* yapıyor — varlık üretiyor, soru yanıtlıyor, araç
çalıştırıyor, API çağırıyor ve gerçek değeri olan işleri tamamlıyor. Ama ödeme katmanı
insan işletmeleri için tasarlandı:

- **Kart rayları (Stripe, PayPal, …)** genellikle kayıtlı bir işletme, banka hesabı, KYC
  ve panoyu izleyen bir insan gerektirir. Otonom bir ajanda bunların hiçbiri yok.
- **Çıplak zincir-üstü transferler** parayı taşıyabilir ama sana bir *fatura*, bir
  *ödeme sayfası*, *sorgulanabilir bir durum*, bir *iade yolu* ya da istediğin zincirde
  *mutabakat* vermez.
- **Alıcı ile satıcı nadiren aynı zincirdedir.** Bir ajan, müşterisinin fonlarını hangi
  ağda tuttuğuyla uğraşmak zorunda kalmamalı.

Sonuç: ajanlar değer üretebiliyor ama bunu **tahsil edecek** doğal, programatik bir
yolları yok. Ajanlar için "satıcı tarafı" eksik.

## 2. Çözüm: Agent Commerce

Agent Commerce, Stripe'ın bir web sitesine ödeme sayfası vermesi gibi, bir ajana
**merchant kimliği** ve bir araç seti verir — ama otonom yazılım için tasarlanmış ve
stablecoin ile mutabakat yapan bir biçimde.

```bash
# Tek komut: ajanın cüzdanını merchant olarak kaydet + MCP yapılandırması yaz
npx @arcora/agent-commerce onboard

# MCP sunucusunu çalıştır — ajan artık ticaret araçlarına sahip
npx @arcora/agent-commerce serve
```

`serve` sonrası, [MCP](https://modelcontextprotocol.io) destekli her ajan (Claude, Kimi
CLI, Hermes ve diğerleri) dört araç kazanır:

| Araç | Ne yapar |
|------|----------|
| `list_catalog` | Bu merchant'ın sattığı ürünleri listeler (id, ad, fiyat). |
| `create_invoice` | Bir katalog kalemi için fatura oluşturur → bir fatura id'si + ödeme sayfası URL'si döner. Alıcı USDC ile **Arc üzerinde, ya da başka bir zincirden köprüleyerek** ödeyebilir. |
| `get_checkout_status` | Faturayı sorgular: `created · paid · expired · failed · refunded · unknown`. |
| `refund_invoice` | *Ödenmiş* bir faturayı iade eder — emanetteki USDC'yi iade penceresi içinde **orijinal ödeyene** geri gönderir. Fonlar başka adrese yönlendirilemez. |

Aynı işlemler insanlara/scriptlere CLI üzerinden de açıktır: `onboard`, `serve`,
`refund <invoiceId>`.

Buradaki *merchant*, basitçe ajanın ödeme almak için Arc'a kayıtlı cüzdanıdır. Ajan
kendi **kataloğunu** kontrol eder — ne sunduğunu ve hangi fiyatla — ve fatura kesmek,
durum sorgulamak ve iade etmek için bu araçları kullanır. (Testnet'te katalog küçük,
statik bir demo listesidir; ajan-bazlı dinamik kataloglar [yol haritasında](./ROADMAP.tr.md).)

## 3. Bir ödeme nasıl akar

Mutabakat, Circle'ın USDC-yerli zinciri **Arc** üzerinde, **ArcFXGateway** emanet
(escrow) kontratı aracılığıyla gerçekleşir. Zincirler arası geçişler **Circle CCTP**
kullanır (USDC'nin yerel yak-ve-bas mekanizması; bu yüzden sarmalanmış varlık ya da
köprü-emaneti riski yoktur).

### Gelen (alıcı öder)

```
ajan ── create_invoice ─▶ fatura id'si + ödeme sayfası URL'si
                              │
alıcı USDC öder ──────────────┤
   • zaten Arc'ta ────────────┼─▶ doğrudan emanete yatırılır
   • başka zincirde (Base) ───┘   kaynakta yak → CCTP attestation
                                   → relayer Arc'ta basar → emanete mutabakat
                                                          │
ajan ── get_checkout_status ─▶ "paid"  ◀──────────────────┘
```

Ajanın, alıcının hangi zinciri kullandığını bilmesine gerek yoktur. Tek bir fatura
oluşturur; alıcı USDC'si neredeyse oradan öder.

### Giden (merchant istediği yerde tahsil eder)

Bir merchant, gelirini hangi zincirde alacağını seçebilir:

```bash
npx @arcora/agent-commerce onboard --payout-chain 84532 --payout-address 0xAdresin
```

Emanet talep edilebilir hâle geldiğinde, relayer fonları CCTP ile Arc → merchant'ın
seçtiği zincire köprüler. Varsayılan olarak gelir Arc'ta kalır.

### İadeler

`refund_invoice` (ve `refund` CLI komutu), kontratın zincir-üstü `refundInvoice`'unu
çağırır ve emanetteki USDC'yi **7 günlük iade penceresi** içinde Arc üzerinde **orijinal
ödeyene** geri gönderir. Ödeyen zincir-üstünde sabit olduğundan, bir iade asla rastgele
bir adrese fon gönderemez — bunu bir ajan aracı olarak açmayı güvenli kılan şey budur.
Relayer ayrıca mutabakata oturamayan zincirler arası bir ödemeyi otomatik iade eder.

## 4. Neden USDC, Arc ve CCTP

- **USDC** — yaygın tutulan, tam rezervli bir dolar stablecoin'i. Ajanlar oynak bir
  varlıkla değil, dolar cinsinden fiyatlandırır.
- **Arc** — Circle'ın, **USDC'nin yerli gas token'ı olduğu** ve kesinliğin saniye-altı
  olduğu zinciri. Bu onu doğal bir mutabakat katmanı yapar: yönetilecek ayrı bir gas
  varlığı yok ve ödemeler hızlı onaylanır.
- **CCTP** — Circle'ın Zincirler Arası Transfer Protokolü, USDC'yi kaynak zincirde
  **yakıp** hedefte kanonik token'ı **basarak** taşır. Sarmalanmış varlık yok, üçüncü
  taraf köprü emaneti yok — aynı dolar, başka bir zincirde.

Arc'ın kendisi saniyenin çok altında kesinleşir; bir *zincirler arası* ödeme ek olarak
CCTP'nin attestation servisini bekler; bu da kaynak zincirin kesinliğine bağlı olarak
tipik olarak saniyelerden birkaç dakikaya kadar sürer. Birlikte bunlar, bir ajanın
neredeyse her zincirdeki bir alıcıdan gerçek bir doları kabul edip dolar-yerli bir
defterde mutabakata oturtmasını sağlar.

## 5. Mimari

Agent Commerce, Arcorapay platformu üzerinde küçük ve odaklı bir paket seti olarak gelir:

| Katman | Paket / bileşen | Rol |
|--------|------------------|-----|
| İstemci | [`@arcora/sdk`](https://www.npmjs.com/package/@arcora/sdk) | Arcorapay genel API'si için tip-güvenli istemci (fatura oluştur, durum, webhook). |
| Mantık | `@arcora/agent-commerce-core` | `Commerce` (katalog / fatura / durum) ve `createRefunder` (zincir-üstü iade). |
| Araçlar | `@arcora/agent-commerce-mcp` | Dört aracı sunan MCP stdio sunucusu. |
| Dağıtım | **`@arcora/agent-commerce`** | Tek-komut CLI; core + mcp + sdk'yı tek bir ikiliye paketler. |
| Mutabakat | **ArcFXGateway** (akıllı kontrat) | Merchant kayıt defteri, fatura emaneti, settle, claim, refund ve kapsamı sınırlı delege yetkilendirmesi. |
| Hareket | **Relayer** | Emanet olaylarını izleyen ve zincirler arası gelen/giden geçişleri (CCTP yak → attestation → bas) ile zincir-üstü mutabakatı süren Arcorapay-işletimli bir servis. Fonları yalnızca emanet kontratı *üzerinden* taşır — yönlendiremez ya da el koyamaz. |

Yayınlanan `@arcora/agent-commerce`, core, mcp ve sdk'yı içine gömer; bu yüzden kurulumu
yalnızca `viem`, `siwe`, `@modelcontextprotocol/sdk` ve `zod`'u çeker — workspace
tesisatı gerekmez.

## 6. Güven ve güvenlik modeli

- **Saklamasız (non-custodial) anahtarlar.** Merchant imza anahtarı çalışma zamanında
  yalnızca okunur (bir env değişkeninden ya da `0600` keyfile'dan); asla loglanmaz ve
  asla MCP yapılandırmasına yazılmaz.
- **Sınırlı iadeler.** İadeler yalnızca *ödenmiş* bir faturanın *orijinal ödeyenine* fon
  döndürebilir ve yalnızca zincir-üstü iade penceresi içinde — fonları yönlendiremezler.
- **Kapsamı sınırlı delegasyon.** Fatura oluşturma, tek bir hakka sahip bir sunucu
  cüzdanına delege edilir (`RIGHT_CREATE_INVOICE`); mutabakat relayer'ın rolüyle yapılır.
  İade yetkisi (`RIGHT_REFUND`) ayrıdır.
- **Zincir-üstü zamanlamalı emanet.** Fonlar gateway emanetinde **7 günlük bir pencere**
  boyunca durur: bu süre içinde merchant ödeyene iade edebilir ama henüz talep
  (claim) edemez; süre sonunda merchant talep edebilir ve iade penceresi kapanır. Her iki
  zamanlama da zincir-üstünde uygulanır, böylece taraflar birbirini pencerede dolandıramaz.
- **Şeffaf ücretler.** Gateway'in zincir-üstü yapılandırmasına göre bir protokol ücreti
  (baz puan cinsinden) uygulanır: merchant'ın ödemesinden düşülür, zincir-üstünde şeffaf
  şekilde birikir ve fatura iade edilirse ödeyene geri verilir.

## 7. Dene

- **npm:** [`@arcora/agent-commerce`](https://www.npmjs.com/package/@arcora/agent-commerce) (MIT)
- **Kaynak:** [github.com/Kubudak90/agent-commerce](https://github.com/Kubudak90/agent-commerce)
- **Hızlı başlangıç:** `npx @arcora/agent-commerce onboard` → ajanının MCP yapılandırmasına `npx @arcora/agent-commerce serve` ekle → sat.

## 8. Bugün kanıtlanan (testnet)

Arc Testnet üzerinde, kaynak zincir olarak Base Sepolia ile, tüm döngü uçtan uca
çalıştırıldı:

- Bir ajan canlı bir merchant olarak onboard oldu ve gerçek faturalar kesti.
- Bir alıcı **Base Sepolia**'dan ödedi; ödeme CCTP ile köprülendi ve Arc'ta `paid` olarak
  mutabakata oturdu.
- Giden ödeme (payout) geçişi çalıştırıldı: relayer USDC'yi CCTP ile **Arc → Base**
  köprüledi (Arc'ta yak → attestation → Base'de bas). Canlı bir merchant için tam
  talep → ödeme akışı 7 günlük emanet penceresine bağlıdır; dolayısıyla anında değil, o
  pencerenin sonunda tamamlanır.
- Ödenmiş bir fatura zincir-üstünde **iade edildi** ve USDC orijinal ödeyene geri döndü.

Geriye **mainnet**'e geçiş ve sponsorlu gas ile sıfır-friction onboarding kalıyor —
[ROADMAP.tr.md](./ROADMAP.tr.md)'de.

---

### Ek — referans (testnet)

| Öğe | Değer |
|------|-------|
| Mutabakat zinciri | Arc Testnet (chain id `5042002`, CCTP domain `26`, USDC-yerli gas) |
| Örnek kaynak zincir | Base Sepolia (chain id `84532`, CCTP domain `6`) |
| Mutabakat kontratı | ArcFXGateway `0xEaE914D53B2895c832dA83419a7687eF7D1d0142` (Arc Testnet) |
| Zincirler arası | Circle CCTP V2 (yak → IRIS attestation → bas) |
| Paket | `@arcora/agent-commerce` (npm, MIT) |

*Yukarıdaki adresler ve parametreler testnet değerleridir ve mainnet için değişecektir.*
