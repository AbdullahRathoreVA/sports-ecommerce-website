import "server-only";
import { Document, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { formatMoney } from "@/lib/utils";
import { STATUS_LABEL, type InvoiceView } from "@/lib/invoice-view";

/** A4 PDF of an invoice — same data and wording as the web page (InvoiceDocument). */

const INK = "#0b0b0c";
const RED = "#d32a26";
const MUTED = "#6b6f76";
const LINE = "#e4e5e8";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9.5, color: INK, paddingBottom: 70 },
  band: { backgroundColor: INK, color: "#fff", paddingHorizontal: 36, paddingVertical: 22, flexDirection: "row", justifyContent: "space-between" },
  brandRow: { flexDirection: "row", alignItems: "center" },
  brand: { fontFamily: "Helvetica-Bold", fontSize: 20, letterSpacing: 2 },
  brandSub: { fontFamily: "Helvetica-Bold", fontSize: 8, color: RED, letterSpacing: 3, marginTop: 2 },
  tagline: { fontSize: 7, color: "#b9bcc2", letterSpacing: 2, marginTop: 6 },
  contact: { fontSize: 8.5, color: "#d6d8dc", textAlign: "right", lineHeight: 1.5 },
  founder: { fontFamily: "Helvetica-Bold", fontSize: 10, color: "#fff", textAlign: "right" },
  body: { paddingHorizontal: 36, paddingTop: 22 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 30, letterSpacing: -0.5 },
  dot: { color: RED },
  stamp: { fontFamily: "Helvetica-Bold", fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1.5, borderRadius: 3 },
  grid: { flexDirection: "row", marginTop: 14, backgroundColor: INK, borderRadius: 6, padding: 12 },
  cell: { flex: 1 },
  label: { fontSize: 6.5, color: "#9da1a8", letterSpacing: 1.5, fontFamily: "Helvetica-Bold" },
  value: { fontSize: 10, color: "#fff", marginTop: 3, fontFamily: "Helvetica-Bold" },
  twoCol: { flexDirection: "row", marginTop: 14, gap: 12 },
  card: { flex: 1, borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 11 },
  cardRed: { borderLeftWidth: 3, borderLeftColor: RED },
  cardLabel: { fontSize: 6.5, color: MUTED, letterSpacing: 1.5, fontFamily: "Helvetica-Bold", marginBottom: 5 },
  strong: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  muted: { color: MUTED },
  kv: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  th: { flexDirection: "row", backgroundColor: INK, color: "#fff", paddingVertical: 7, paddingHorizontal: 8, marginTop: 16, borderTopLeftRadius: 5, borderTopRightRadius: 5, fontFamily: "Helvetica-Bold", fontSize: 7.5, letterSpacing: 1 },
  tr: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: LINE },
  cNo: { width: 22 },
  cDesc: { flex: 1, paddingRight: 8 },
  cQty: { width: 50, textAlign: "right" },
  cUnit: { width: 72, textAlign: "right" },
  cTotal: { width: 80, textAlign: "right" },
  totals: { marginTop: 10, marginLeft: "auto", width: 230 },
  grand: { flexDirection: "row", justifyContent: "space-between", backgroundColor: INK, color: "#fff", padding: 10, marginTop: 6, borderRadius: 5 },
  grandAmt: { fontFamily: "Helvetica-Bold", fontSize: 15, color: "#fff" },
  notes: { marginTop: 16, borderWidth: 1, borderStyle: "dashed", borderColor: "#c9ccd1", borderRadius: 6, padding: 11 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: RED, color: "#fff", paddingVertical: 12, paddingHorizontal: 36, flexDirection: "row", justifyContent: "space-between", fontSize: 8 },
});

function Mark() {
  return (
    <Svg viewBox="0 0 120 96" style={{ width: 44, height: 35, marginRight: 10 }}>
      <Path d="M6 92 L52 4 L98 92 H74 L52 48 L30 92 Z" fill="#ffffff" />
      <Path d="M22 78 C46 64 74 44 118 18 C96 40 70 60 40 80 Z" fill={RED} />
    </Svg>
  );
}

function InvoicePdf({ v }: { v: InvoiceView }) {
  const m = (c: number) => formatMoney(c, v.currency);
  const stamp =
    v.status === "PAID" ? { text: "PAID", color: "#15803d" } : v.status === "VOID" ? { text: "VOID", color: MUTED } : v.overdue ? { text: "OVERDUE", color: RED } : v.status === "DRAFT" ? { text: "DRAFT", color: MUTED } : null;
  return (
    <Document title={`Invoice ${v.number}`} author={v.company.name}>
      <Page size="A4" style={s.page}>
        <View style={s.band}>
          <View>
            <View style={s.brandRow}>
              <Mark />
              <View>
                <Text style={s.brand}>ALROBEL</Text>
                <Text style={s.brandSub}>SPORTS WEAR</Text>
              </View>
            </View>
            <Text style={s.tagline}>{v.company.tagline.toUpperCase()}</Text>
          </View>
          <View>
            <Text style={s.founder}>{v.company.founder}</Text>
            <Text style={s.contact}>{v.company.address}</Text>
            {v.company.phone ? <Text style={s.contact}>{v.company.phone}</Text> : null}
            {v.company.email ? <Text style={s.contact}>{v.company.email}</Text> : null}
            <Text style={s.contact}>{v.company.website}</Text>
            {v.company.taxId ? <Text style={s.contact}>NTN {v.company.taxId}</Text> : null}
          </View>
        </View>

        <View style={s.body}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={s.title}>
              INVOICE<Text style={s.dot}>.</Text>
            </Text>
            {stamp ? <Text style={[s.stamp, { color: stamp.color, borderColor: stamp.color }]}>{stamp.text}</Text> : null}
          </View>

          <View style={s.grid}>
            <View style={s.cell}><Text style={s.label}>INVOICE NO</Text><Text style={s.value}>{v.number}</Text></View>
            <View style={s.cell}><Text style={s.label}>{v.poNumber ? "PO NUMBER" : "ORDER"}</Text><Text style={s.value}>{v.poNumber ?? v.orderNumber ?? "—"}</Text></View>
            <View style={s.cell}><Text style={s.label}>INVOICE DATE</Text><Text style={s.value}>{v.issueDate}</Text></View>
            <View style={s.cell}><Text style={s.label}>DUE DATE</Text><Text style={s.value}>{v.dueDate ?? "On receipt"}</Text></View>
          </View>

          <View style={s.twoCol}>
            <View style={[s.card, s.cardRed]}>
              <Text style={s.cardLabel}>BILL TO</Text>
              <Text style={s.strong}>{v.bill.company ?? v.bill.name}</Text>
              {v.bill.company ? <Text style={{ marginTop: 2 }}>{v.bill.name}</Text> : null}
              {v.bill.address ? <Text style={[s.muted, { marginTop: 3 }]}>{v.bill.address}</Text> : null}
              <Text style={[s.muted, { marginTop: 3 }]}>{v.bill.email}</Text>
              {v.bill.phone ? <Text style={s.muted}>{v.bill.phone}</Text> : null}
            </View>
            <View style={s.card}>
              <Text style={s.cardLabel}>SHIPMENT & TERMS</Text>
              <View style={s.kv}><Text style={s.muted}>Origin</Text><Text>{v.origin}</Text></View>
              {v.shipVia ? <View style={s.kv}><Text style={s.muted}>Via</Text><Text>{v.shipVia}</Text></View> : null}
              {v.deliveryTime ? <View style={s.kv}><Text style={s.muted}>Delivery</Text><Text>{v.deliveryTime}</Text></View> : null}
              <View style={s.kv}><Text style={s.muted}>Status</Text><Text>{STATUS_LABEL[v.status]}</Text></View>
              <Text style={[s.cardLabel, { marginTop: 8 }]}>PAYMENT TERMS</Text>
              <Text>{v.paymentTerms}</Text>
            </View>
          </View>

          <View style={s.th}>
            <Text style={s.cNo}>#</Text>
            <Text style={s.cDesc}>DESCRIPTION</Text>
            <Text style={s.cQty}>QTY</Text>
            <Text style={s.cUnit}>UNIT</Text>
            <Text style={s.cTotal}>TOTAL</Text>
          </View>
          {v.items.map((it, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={s.cNo}>{i + 1}</Text>
              <View style={s.cDesc}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{it.description}</Text>
                {it.details ? <Text style={[s.muted, { fontSize: 8, marginTop: 2 }]}>{it.details}</Text> : null}
              </View>
              <Text style={s.cQty}>{it.quantity}</Text>
              <Text style={s.cUnit}>{m(it.unitCents)}</Text>
              <Text style={[s.cTotal, { fontFamily: "Helvetica-Bold" }]}>{m(it.totalCents)}</Text>
            </View>
          ))}

          <View style={s.totals} wrap={false}>
            <View style={s.kv}><Text style={s.muted}>Subtotal</Text><Text>{m(v.subtotalCents)}</Text></View>
            {v.discountCents > 0 ? <View style={s.kv}><Text style={s.muted}>Discount</Text><Text>−{m(v.discountCents)}</Text></View> : null}
            {v.taxCents > 0 ? <View style={s.kv}><Text style={s.muted}>Tax ({v.taxBasisPoints / 100}%)</Text><Text>{m(v.taxCents)}</Text></View> : null}
            <View style={s.kv}><Text style={s.muted}>Shipping</Text><Text>{v.shippingCents > 0 ? m(v.shippingCents) : "—"}</Text></View>
            <View style={s.grand}>
              <View>
                <Text style={{ fontSize: 7, letterSpacing: 1.5, color: "#9da1a8", fontFamily: "Helvetica-Bold" }}>GRAND TOTAL · {v.currency}</Text>
                <Text style={{ fontSize: 7, color: RED, marginTop: 3, fontFamily: "Helvetica-Bold" }}>THANK YOU!</Text>
              </View>
              <Text style={s.grandAmt}>{m(v.totalCents)}</Text>
            </View>
            {v.paidCents > 0 ? (
              <>
                <View style={s.kv}><Text style={s.muted}>Paid</Text><Text>{m(v.paidCents)}</Text></View>
                <View style={s.kv}><Text style={{ fontFamily: "Helvetica-Bold" }}>Balance due</Text><Text style={{ fontFamily: "Helvetica-Bold" }}>{m(v.balanceCents)}</Text></View>
              </>
            ) : null}
          </View>

          <View style={s.notes} wrap={false}>
            <Text style={s.cardLabel}>PAYMENT & NOTES</Text>
            <Text>• {v.paymentTerms}</Text>
            {v.bankDetails ? <Text style={{ marginTop: 4 }}>• Bank details: {v.bankDetails.replace(/\n+/g, " · ")}</Text> : <Text style={{ marginTop: 4 }}>• Bank details are sent with this invoice by email.</Text>}
            {v.notes?.split("\n").filter(Boolean).map((n, i) => <Text key={i} style={{ marginTop: 4 }}>• {n}</Text>)}
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>{[v.company.email, v.company.phone, v.company.address].filter(Boolean).join("  •  ")}</Text>
          <Text>Computer-generated invoice · no signature required</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(v: InvoiceView): Promise<Buffer> {
  return renderToBuffer(<InvoicePdf v={v} />);
}
