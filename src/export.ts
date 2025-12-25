
import { CapacityAdvisorResponse, AppState, GroundingMetadata } from './types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generateCSV = (data: CapacityAdvisorResponse, state: AppState): string => {
  const headers = ['Location', 'Machine Type', 'Provisioning Model', 'Obtainability Score', 'Uptime Score', 'VM Count'];
  const rows = data.recommendations.flatMap(rec => 
    rec.shards.map(shard => {
       const obt = rec.scores.find(s => s.name === 'obtainability')?.value || 0;
       const up = rec.scores.find(s => s.name === 'uptime')?.value || 0;
       return [
        shard.location.split('/').pop(),
        shard.machineType,
        shard.provisioningModel,
        obt.toFixed(2),
        up.toFixed(2),
        shard.count
      ].join(',')
    })
  );

  return [headers.join(','), ...rows].join('\n');
};

export const generateHTML = (data: CapacityAdvisorResponse, state: AppState, groundingData: GroundingMetadata | null): string => {
  const date = new Date().toLocaleString();
  const topRec = data.recommendations[0];
  const topScore = topRec?.scores.find(s => s.name === 'obtainability')?.value || 0;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Spot Capacity Report - ${state.project}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.6; }
          h1 { color: #4f46e5; border-bottom: 2px solid #eee; padding-bottom: 10px; }
          .meta { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .meta p { margin: 5px 0; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { text-align: left; background: #e0e7ff; padding: 12px; font-size: 12px; text-transform: uppercase; }
          td { padding: 12px; border-bottom: 1px solid #eee; font-family: monospace; }
          .insight { margin-top: 40px; padding: 25px; background: #f0fdf4; border-radius: 12px; border: 1px solid #dcfce7; }
          .score { font-size: 24px; font-weight: bold; color: #4f46e5; }
        </style>
      </head>
      <body>
        <h1>Spot Capacity Advisor Report</h1>
        <div class="meta">
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Project:</strong> ${state.project}</p>
          <p><strong>Region:</strong> ${state.region}</p>
          <p><strong>Machine Type:</strong> ${state.selectedMachineType}</p>
          <p><strong>Target Size:</strong> ${state.size} VMs</p>
          <p><strong>Top Obtainability Score:</strong> <span class="score">${(topScore * 100).toFixed(0)}%</span></p>
        </div>

        <h2>Recommended Placements</h2>
        <table>
          <thead>
            <tr>
              <th>Zone</th>
              <th>Machine Type</th>
              <th>Obtainability</th>
              <th>Est. Uptime</th>
              <th>VM Count</th>
            </tr>
          </thead>
          <tbody>
            ${data.recommendations.flatMap(rec => rec.shards.map(shard => {
               const obt = rec.scores.find(s => s.name === 'obtainability')?.value || 0;
               const up = rec.scores.find(s => s.name === 'uptime')?.value || 0;
               return `<tr>
                  <td>${shard.location.split('/').pop()}</td>
                  <td>${shard.machineType}</td>
                  <td><strong>${(obt * 100).toFixed(0)}%</strong></td>
                  <td>${(up * 100).toFixed(0)}%</td>
                  <td>${shard.count}</td>
               </tr>`;
            })).join('')}
          </tbody>
        </table>

        ${groundingData ? `
          <div class="insight">
            <h3>Advisor Insights</h3>
            <div style="white-space: pre-wrap;">${groundingData.insight.replace(/\*\*/g, '')}</div>
            ${groundingData.sources.length > 0 ? `<p style="font-size:12px; margin-top:15px; color:#666;">Sources: ${groundingData.sources.map(s => s.title).join(', ')}</p>` : ''}
          </div>
        ` : ''}
      </body>
    </html>
  `;
};

/**
 * Aggressively sanitizes text for jsPDF which only supports basic ASCII/Latin-1 by default.
 * Removes emojis, replaces smart quotes, and formats Markdown structure.
 */
const cleanMarkdownForPDF = (text: string): string => {
  if (!text) return '';

  return text
    // 1. Remove Emojis (Ranges for various emoji blocks)
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Symbols & Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport & Map
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental
    // 2. Normalize Quotes and Dashes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    // 3. Format Headers (convert ### Header to CAPS)
    .replace(/^###\s+(.+)$/gm, '\n$1\n----------------------------------------')
    .replace(/^##\s+(.+)$/gm, '\n$1\n========================================')
    // 4. Format Lists
    .replace(/^\s*[\-\*]\s+/gm, '  • ')
    // 5. Remove Bold/Italic Markdown
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    // 6. Flatten Tables (simple approach: replace pipes with spaces)
    .replace(/\|/g, '  ')
    // 7. Remove Blockquote chars
    .replace(/^>\s?/gm, '')
    .trim();
};

export const generatePDF = (data: CapacityAdvisorResponse, state: AppState, groundingData: GroundingMetadata | null) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(22);
  doc.setTextColor(79, 70, 229); // Indigo
  doc.text('Spot Capacity Advisor Report', 14, 22);

  // Subtitle / Date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 30);

  // Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 35, 180, 40, 3, 3, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(70);
  
  doc.text(`Project ID:`, 20, 45);
  doc.text(`Region:`, 20, 52);
  doc.text(`Machine Type:`, 20, 59);
  doc.text(`Provisioning:`, 20, 66);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(state.project, 60, 45);
  doc.text(state.region, 60, 52);
  doc.text(state.selectedMachineType, 60, 59);
  doc.text(`SPOT (${state.size} VMs)`, 60, 66);

  // Table Data
  const tableRows = data.recommendations.flatMap(rec =>
    rec.shards.map(shard => {
       const obt = rec.scores.find(s => s.name === 'obtainability')?.value || 0;
       const up = rec.scores.find(s => s.name === 'uptime')?.value || 0;
       return [
        shard.location.split('/').pop() || 'Unknown',
        shard.machineType,
        (obt * 100).toFixed(0) + '%',
        (up * 100).toFixed(0) + '%',
        shard.count.toString()
      ];
    })
  );

  // Recommendations Table
  autoTable(doc, {
    startY: 85,
    head: [['Zone', 'Machine Type', 'Obtainability', 'Est. Uptime', 'VM Count']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
        0: { fontStyle: 'bold' },
        2: { textColor: [16, 185, 129] } // Emerald
    }
  });

  // Insights Section
  let finalY = (doc as any).lastAutoTable.finalY || 85;
  
  if (groundingData && groundingData.insight) {
      if (finalY > 200) {
          doc.addPage();
          finalY = 20;
      } else {
          finalY += 15;
      }

      doc.setFontSize(14);
      doc.setTextColor(79, 70, 229);
      doc.setFont('helvetica', 'bold');
      doc.text('Advisor Insights', 14, finalY);
      finalY += 10;

      doc.setFontSize(10);
      doc.setTextColor(50);
      doc.setFont('courier', 'normal'); // Use courier for better alignment of clean text
      
      const cleanText = cleanMarkdownForPDF(groundingData.insight);
      const splitText = doc.splitTextToSize(cleanText, 180);
      
      // Pagination for text
      let lineHeight = 5;
      for (let i = 0; i < splitText.length; i++) {
        if (finalY > 280) {
          doc.addPage();
          finalY = 20;
        }
        doc.text(splitText[i], 14, finalY);
        finalY += lineHeight;
      }
      
      // Sources
      if (groundingData.sources.length > 0) {
          if (finalY > 270) {
             doc.addPage();
             finalY = 20;
          } else {
             finalY += 10;
          }

          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.setFont('helvetica', 'italic');
          const sources = "Sources: " + groundingData.sources.map(s => s.title).join(', ');
          const splitSources = doc.splitTextToSize(sources, 180);
          doc.text(splitSources, 14, finalY);
      }
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, 195, 290, { align: 'right' });
    doc.text('Generated by Spot Capacity Advisor', 14, 290);
  }

  doc.save(`capacity-report-${state.project}.pdf`);
};
