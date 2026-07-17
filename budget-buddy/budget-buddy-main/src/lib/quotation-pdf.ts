import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatBRL, effectiveUnitPrice, type Quotation } from "./budget-store";

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

export function exportQuotationPDF(quotation: Quotation) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let y = 50;

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Detalhamento da Cotação", marginX, y);
  y += 22;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Cotação: ${quotation.name}`, marginX, y);
  y += 14;
  doc.text(
    `Status: ${quotation.status === "encerrado" ? "Encerrada" : "Aberta"}`,
    marginX,
    y
  );
  y += 14;
  doc.text(`Criada em: ${formatDate(quotation.createdAt)}`, marginX, y);
  y += 14;
  doc.text(
    `Exportado em: ${new Date().toLocaleString("pt-BR")}`,
    marginX,
    y
  );
  y += 20;

  // Calcula totais por fornecedor
  const totals = quotation.proposals.map((p) => {
    let total = 0;
    let missing = 0;
    quotation.items.forEach((it) => {
      const raw = p.prices[it.id] ?? 0;
      const price = effectiveUnitPrice(p, it.id);
      if (raw > 0) total += price * it.quantity;
      else missing++;
    });
    return { proposal: p, total, missing };
  });

  const winnerId = quotation.winnerProposalId;
  const winner = totals.find((t) => t.proposal.id === winnerId) ?? null;

  // Itens
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Itens cotados", marginX, y);
  y += 6;

  autoTable(doc, {
    startY: y + 4,
    head: [["#", "Descrição", "Unidade", "Quantidade"]],
    body: quotation.items.map((it, i) => [
      String(i + 1),
      it.description,
      it.unit,
      String(it.quantity),
    ]),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59] },
    margin: { left: marginX, right: marginX },
  });
  y = (doc as any).lastAutoTable.finalY + 20;

  // Fornecedores participantes
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Fornecedores participantes", marginX, y);
  y += 6;

  autoTable(doc, {
    startY: y + 4,
    head: [["Fornecedor", "Nº Proposta", "Redutor", "Itens cotados", "Total proposto", "Situação"]],
    body: totals.map((t) => {
      const isWinner = t.proposal.id === winnerId;
      const cotados = quotation.items.length - t.missing;
      return [
        t.proposal.supplier,
        t.proposal.proposalNumber || "—",
        (t.proposal.discountPercent ?? 0) > 0 ? `${t.proposal.discountPercent}%` : "—",
        `${cotados}/${quotation.items.length}`,
        t.total > 0 ? formatBRL(t.total) : "—",
        isWinner
          ? "VENCEDORA"
          : t.missing > 0
          ? `Incompleta (${t.missing} item(ns) sem preço)`
          : "Completa",
      ];
    }),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59] },
    margin: { left: marginX, right: marginX },
    didParseCell: (data) => {
      if (data.section === "body") {
        const row = totals[data.row.index];
        if (row && row.proposal.id === winnerId) {
          data.cell.styles.fillColor = [220, 252, 231];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 20;

  // Matriz comparativa de preços
  if (quotation.proposals.length > 0 && quotation.items.length > 0) {
    if (y > 680) {
      doc.addPage();
      y = 50;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Matriz comparativa de preços unitários", marginX, y);
    y += 6;

    const head = [
      [
        "Item",
        ...quotation.proposals.map((p) =>
          (p.discountPercent ?? 0) > 0
            ? `${p.supplier} (redutor ${p.discountPercent}%)`
            : p.supplier,
        ),
      ],
    ];
    const body = quotation.items.map((it) => {
      const row: string[] = [`${it.description} (${it.quantity} ${it.unit})`];
      quotation.proposals.forEach((p) => {
        const raw = p.prices[it.id] ?? 0;
        const price = effectiveUnitPrice(p, it.id);
        row.push(raw > 0 ? formatBRL(price) : "—");
      });
      return row;
    });

    autoTable(doc, {
      startY: y + 4,
      head,
      body,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59] },
      margin: { left: marginX, right: marginX },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index > 0) {
          const it = quotation.items[data.row.index];
          const proposal = quotation.proposals[data.column.index - 1];
          const raw = proposal.prices[it.id] ?? 0;
          const price = effectiveUnitPrice(proposal, it.id);
          let best: number | null = null;
          quotation.proposals.forEach((p) => {
            const vRaw = p.prices[it.id] ?? 0;
            const v = effectiveUnitPrice(p, it.id);
            if (vRaw > 0 && (best === null || v < best)) best = v;
          });
          if (best !== null && raw > 0 && price === best) {
            data.cell.styles.fillColor = [220, 252, 231];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // Resultado / Vencedora
  if (y > 700) {
    doc.addPage();
    y = 50;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Resultado", marginX, y);
  y += 18;

  doc.setFontSize(10);
  if (winner) {
    doc.setFont("helvetica", "bold");
    doc.text(`Proposta vencedora: ${winner.proposal.supplier}`, marginX, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    if (winner.proposal.proposalNumber) {
      doc.text(`Nº da proposta: ${winner.proposal.proposalNumber}`, marginX, y);
      y += 14;
    }
    doc.text(`Valor total contratado: ${formatBRL(winner.total)}`, marginX, y);
    y += 14;

    if (quotation.winnerJustification) {
      doc.setFont("helvetica", "bold");
      doc.text("Justificativa da escolha:", marginX, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      const maxWidth = doc.internal.pageSize.getWidth() - marginX * 2;
      const lines = doc.splitTextToSize(quotation.winnerJustification, maxWidth);
      doc.text(lines, marginX, y);
      y += lines.length * 12 + 4;
    }


    // Oportunidades de redução vs. melhor preço por item
    const opportunities: Array<{
      desc: string;
      qty: number;
      winnerPrice: number;
      bestPrice: number;
      bestSupplier: string;
      saving: number;
    }> = [];
    quotation.items.forEach((it) => {
      const winnerPrice = effectiveUnitPrice(winner.proposal, it.id);
      let best: { price: number; supplier: string } | null = null;
      quotation.proposals.forEach((p) => {
        const raw = p.prices[it.id] ?? 0;
        const v = effectiveUnitPrice(p, it.id);
        if (raw > 0 && (best === null || v < (best as { price: number }).price)) {
          best = { price: v, supplier: p.supplier };
        }
      });
      const b = best as { price: number; supplier: string } | null;
      if (
        b &&
        b.supplier !== winner.proposal.supplier &&
        b.price < winnerPrice
      ) {
        opportunities.push({
          desc: it.description,
          qty: it.quantity,
          winnerPrice,
          bestPrice: b.price,
          bestSupplier: b.supplier,
          saving: (winnerPrice - b.price) * it.quantity,
        });
      }
    });

    if (opportunities.length > 0) {
      const totalSaving = opportunities.reduce((s, o) => s + o.saving, 0);
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.text("Oportunidades de redução", marginX, y);
      y += 4;
      autoTable(doc, {
        startY: y + 4,
        head: [["Item", "Preço vencedor", "Melhor preço", "Fornecedor", "Economia"]],
        body: opportunities.map((o) => [
          o.desc,
          formatBRL(o.winnerPrice),
          formatBRL(o.bestPrice),
          o.bestSupplier,
          formatBRL(o.saving),
        ]),
        foot: [["", "", "", "Total potencial", formatBRL(totalSaving)]],
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [30, 41, 59] },
        footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: "bold" },
        margin: { left: marginX, right: marginX },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        `Total contratado otimizado (se cada item fosse comprado do melhor fornecedor): ${formatBRL(
          winner.total - totalSaving
        )}`,
        marginX,
        y
      );
    }
  } else {
    doc.setFont("helvetica", "normal");
    doc.text("Nenhuma proposta vencedora definida.", marginX, y);
  }

  // Footer com numeração
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - marginX,
      doc.internal.pageSize.getHeight() - 20,
      { align: "right" }
    );
  }

  const safeName = quotation.name.replace(/[^\w\-]+/g, "_");
  doc.save(`cotacao_${safeName}.pdf`);
}
