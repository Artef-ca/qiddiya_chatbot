/**
 * Shared renderers for PDF/image export (used by export-chat and export-pinboard).
 * Renders tables and charts as HTML/SVG for export.
 */

export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : parseFloat(String(value)) || 0;
}

export function renderTableFromData(block: { headers?: string[]; rows?: unknown[][] }): string {
  if (!block.headers || !block.rows) {
    return '';
  }

  const headers = block.headers.map((h: string) => `<th style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: 600; text-align: left;">${escapeHtml(String(h))}</th>`).join('');
  const rows = block.rows.map((row: unknown[]) => {
    const cells = row.map((cell: unknown) => {
      const cellText = String(cell || '');
      const normalizedText = cellText.toLowerCase().trim();
      let statusClass = '';
      if (normalizedText.includes('positive') || normalizedText === 'positive label') {
        statusClass = 'background: #E8F5E9; color: #2E7D32;';
      } else if (normalizedText.includes('negative') || normalizedText === 'negative label') {
        statusClass = 'background: #FFEBEE; color: #C62828;';
      } else if (normalizedText.includes('warning') || normalizedText === 'warning label') {
        statusClass = 'background: #FFF3E0; color: #E65100;';
      }
      const displayText = normalizedText.includes('label')
        ? (normalizedText.includes('positive') ? 'Positive Label' :
          normalizedText.includes('negative') ? 'Negative Label' :
            normalizedText.includes('warning') ? 'Warning Label' : cellText)
        : cellText;
      return `<td style="padding: 8px; border: 1px solid #e5e7eb; text-align: left; ${statusClass}">${escapeHtml(displayText)}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `
    <div style="margin: 16px 0; overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; font-family: 'Manrope', sans-serif;">
        <thead>
          <tr>${headers}</tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

export function renderChartAsSVG(block: {
  title?: string;
  subtitle?: string;
  chartType?: string;
  data?: unknown[];
}): string {
  if (!block.data || !Array.isArray(block.data) || block.data.length === 0) {
    return '';
  }
  const data = block.data;

  const title = block.title ? `<h3 style="font-family: 'Manrope', sans-serif; font-size: 18px; font-weight: 600; margin: 16px 0 8px 0; color: #111827;">${escapeHtml(block.title)}</h3>` : '';
  const subtitle = block.subtitle ? `<p style="font-family: 'Manrope', sans-serif; font-size: 14px; color: #6b7280; margin: 0 0 12px 0;">${escapeHtml(block.subtitle)}</p>` : '';

  const chartType = block.chartType || 'bar';
  const width = 700;
  const height = 300;
  const padding = { top: 40, right: 40, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allKeys = new Set<string>();
  data.forEach((item: unknown) => {
    Object.keys(toRecord(item)).forEach(key => {
      if (key !== 'name') allKeys.add(key);
    });
  });
  const dataKeys = Array.from(allKeys);

  if (dataKeys.length === 0) {
    return '';
  }

  const allValues: number[] = [];
  data.forEach((item: unknown) => {
    const itemRecord = toRecord(item);
    dataKeys.forEach(key => {
      const val = itemRecord[key];
      const numVal = toNumber(val);
      if (!isNaN(numVal)) allValues.push(numVal);
    });
  });

  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues, 0);
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  let svgContent = '';

  if (chartType === 'bar' || chartType === 'line' || chartType === 'area') {
    const xScale = chartWidth / data.length;

    svgContent += `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="#e5e7eb" stroke-width="2"/>`;
    svgContent += `<line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${padding.left + chartWidth}" y2="${padding.top + chartHeight}" stroke="#e5e7eb" stroke-width="2"/>`;

    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      const value = maxValue - (maxValue / 5) * i;
      svgContent += `<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}" stroke="#f3f4f6" stroke-width="1" stroke-dasharray="2,2"/>`;
      svgContent += `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-family="Manrope" font-size="12" fill="#6b7280">${Math.round(value)}</text>`;
    }

    const barWidth = chartWidth / (data.length * (dataKeys.length + 0.5));

    if (chartType === 'area') {
      dataKeys.forEach((key, keyIndex) => {
        const color = colors[keyIndex % colors.length];
        const pathPoints: string[] = [];
        const linePoints: string[] = [];

        data.forEach((item: unknown, index: number) => {
          const itemRecord = toRecord(item);
          const x = padding.left + (index + 0.5) * xScale;
          const value = toNumber(itemRecord[key]);
          const normalizedValue = ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;
          const pointY = padding.top + chartHeight - normalizedValue;

          if (index === 0) {
            pathPoints.push(`M ${x} ${padding.top + chartHeight}`);
            linePoints.push(`M ${x} ${pointY}`);
          }
          pathPoints.push(`L ${x} ${pointY}`);
          linePoints.push(`L ${x} ${pointY}`);
          if (index === data.length - 1) {
            pathPoints.push(`L ${x} ${padding.top + chartHeight} Z`);
          }
        });

        svgContent += `<path d="${pathPoints.join(' ')}" fill="${color}" opacity="0.4" stroke="none"/>`;
        svgContent += `<path d="${linePoints.join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`;

        data.forEach((item: unknown, index: number) => {
          const itemRecord = toRecord(item);
          const x = padding.left + (index + 0.5) * xScale;
          const value = toNumber(itemRecord[key]);
          const normalizedValue = ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;
          const pointY = padding.top + chartHeight - normalizedValue;
          svgContent += `<circle cx="${x}" cy="${pointY}" r="4" fill="${color}"/>`;
        });
      });
    } else {
      data.forEach((item: unknown, index: number) => {
        const itemRecord = toRecord(item);
        const x = padding.left + (index + 0.5) * xScale;
        const itemName = itemRecord.name || String(itemRecord[Object.keys(itemRecord)[0] || ''] || '');

        dataKeys.forEach((key, keyIndex) => {
          const value = toNumber(itemRecord[key]);
          const normalizedValue = ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;
          const barHeight = normalizedValue;
          const color = colors[keyIndex % colors.length];

          if (chartType === 'bar') {
            const barX = x - (barWidth * dataKeys.length) / 2 + (keyIndex * barWidth);
            svgContent += `<rect x="${barX}" y="${padding.top + chartHeight - barHeight}" width="${barWidth * 0.8}" height="${barHeight}" fill="${color}" opacity="0.8"/>`;
          } else if (chartType === 'line') {
            const pointY = padding.top + chartHeight - barHeight;
            if (index > 0) {
              const prevItem = toRecord(data[index - 1]);
              const prevValue = toNumber(prevItem[key]);
              const prevNormalized = ((prevValue - minValue) / (maxValue - minValue || 1)) * chartHeight;
              const prevX = padding.left + (index - 0.5) * xScale;
              const prevY = padding.top + chartHeight - prevNormalized;
              svgContent += `<line x1="${prevX}" y1="${prevY}" x2="${x}" y2="${pointY}" stroke="${color}" stroke-width="2" fill="none"/>`;
            }
            svgContent += `<circle cx="${x}" cy="${pointY}" r="4" fill="${color}"/>`;
          }
        });

        svgContent += `<text x="${x}" y="${padding.top + chartHeight + 20}" text-anchor="middle" font-family="Manrope" font-size="11" fill="#6b7280">${escapeHtml(String(itemName).substring(0, 10))}</text>`;
      });
    }

    const legendX = padding.left + chartWidth - 150;
    dataKeys.forEach((key, index) => {
      const y = padding.top + (index * 20);
      svgContent += `<rect x="${legendX}" y="${y - 8}" width="12" height="12" fill="${colors[index % colors.length]}"/>`;
      svgContent += `<text x="${legendX + 18}" y="${y}" font-family="Manrope" font-size="11" fill="#374151">${escapeHtml(key)}</text>`;
    });
  } else if (chartType === 'pie' || chartType === 'donut') {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(chartWidth, chartHeight) / 2 - 40;
    const innerRadius = chartType === 'donut' ? radius * 0.6 : 0;

    let currentAngle = -Math.PI / 2;
    const total = allValues.reduce((sum, val) => sum + val, 0);

    data.forEach((item: unknown, index: number) => {
      const itemRecord = toRecord(item);
      const value = toNumber(itemRecord[dataKeys[0]]);
      const percentage = value / total;
      const angle = percentage * 2 * Math.PI;

      const color = colors[index % colors.length];
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);

      const largeArc = angle > Math.PI ? 1 : 0;

      if (innerRadius > 0) {
        const innerX1 = centerX + innerRadius * Math.cos(startAngle);
        const innerY1 = centerY + innerRadius * Math.sin(startAngle);
        const innerX2 = centerX + innerRadius * Math.cos(endAngle);
        const innerY2 = centerY + innerRadius * Math.sin(endAngle);

        svgContent += `<path d="M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${innerX2} ${innerY2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerX1} ${innerY1} Z" fill="${color}" stroke="#fff" stroke-width="2"/>`;
      } else {
        svgContent += `<path d="M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" stroke="#fff" stroke-width="2"/>`;
      }

      const labelAngle = startAngle + angle / 2;
      const labelRadius = radius * 0.7;
      const labelX = centerX + labelRadius * Math.cos(labelAngle);
      const labelY = centerY + labelRadius * Math.sin(labelAngle);
      svgContent += `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-family="Manrope" font-size="11" fill="#fff" font-weight="600">${Math.round(percentage * 100)}%</text>`;

      currentAngle = endAngle;
    });

    const legendX = padding.left + chartWidth - 120;
    data.forEach((item: unknown, index: number) => {
      const itemRecord = toRecord(item);
      const y = padding.top + (index * 20);
      const itemName = itemRecord.name || String(itemRecord[Object.keys(itemRecord)[0] || ''] || '');
      svgContent += `<rect x="${legendX}" y="${y - 8}" width="12" height="12" fill="${colors[index % colors.length]}"/>`;
      svgContent += `<text x="${legendX + 18}" y="${y}" font-family="Manrope" font-size="11" fill="#374151">${escapeHtml(String(itemName))}</text>`;
    });
  } else {
    const xScale = chartWidth / data.length;
    const barWidth = chartWidth / (data.length * (dataKeys.length + 0.5));
    data.forEach((item: unknown, index: number) => {
      const itemRecord = toRecord(item);
      const x = padding.left + (index + 0.5) * xScale;
      const itemName = itemRecord.name || String(itemRecord[Object.keys(itemRecord)[0] || ''] || '');
      dataKeys.forEach((key, keyIndex) => {
        const value = toNumber(itemRecord[key]);
        const normalizedValue = ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;
        const barHeight = normalizedValue;
        const color = colors[keyIndex % colors.length];
        const barX = x - (barWidth * dataKeys.length) / 2 + (keyIndex * barWidth);
        svgContent += `<rect x="${barX}" y="${padding.top + chartHeight - barHeight}" width="${barWidth * 0.8}" height="${barHeight}" fill="${color}" opacity="0.8"/>`;
      });
      svgContent += `<text x="${x}" y="${padding.top + chartHeight + 20}" text-anchor="middle" font-family="Manrope" font-size="11" fill="#6b7280">${escapeHtml(String(itemName).substring(0, 10))}</text>`;
    });
    const legendX = padding.left + chartWidth - 150;
    dataKeys.forEach((key, index) => {
      const y = padding.top + (index * 20);
      svgContent += `<rect x="${legendX}" y="${y - 8}" width="12" height="12" fill="${colors[index % colors.length]}"/>`;
      svgContent += `<text x="${legendX + 18}" y="${y}" font-family="Manrope" font-size="11" fill="#374151">${escapeHtml(key)}</text>`;
    });
  }

  return `
    <div style="margin: 16px 0;">
      ${title}
      ${subtitle}
      <svg width="${width}" height="${height}" style="font-family: 'Manrope', sans-serif;">
        ${svgContent}
      </svg>
    </div>
  `;
}
