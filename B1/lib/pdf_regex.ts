export default function extractAcademicSchema(fullText: string, info: any) {
  // A. Grab core metadata if embedded by the journal publisher
  let title = info?.Title || '';
  let author = info?.Author || 'Unknown Author';
  let year = 'Unknown Year';
  let abstract = 'No abstract section identified';

  // B. Fallback Title: If empty or just a generic filename, scrape the absolute 1st line of text
  if (!title || title.trim() === '' || title.toLowerCase().includes('.pdf')) {
    const textLines = fullText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    title = textLines.length > 0 ? textLines[0] : 'Unknown Title';
  }

  // C. Year Resolution: Extract standard metadata strings, fallback to 4-digit regex scanning
  if (info?.CreationDate) {
    // Standard PDF date prefixes resemble 'D:20240315...' or '2024'
    const dateStr = info.CreationDate.replace('D:', '');
    year = dateStr.substring(0, 4);
  } else {
    const match = fullText.match(/\b(19\d{2}|20[0-2]\d)\b/);
    if (match) year = match[0];
  }

  // D. Abstract Window Isolation Algorithm
  const lowText = fullText.toLowerCase();
  const abstractIdx = lowText.indexOf('abstract');

  if (abstractIdx !== -1) {
    // Slice a safe window (approx. 1500 chars) directly following the word 'Abstract'
    const block = fullText.substring(abstractIdx + 8, abstractIdx + 1500).trim();
    
    // Stop capturing data if the window accidentally bleeds into typical next sections
    const strictStoppers = ['introduction', '1.', 'keywords', 'background', 'i. '];
    let truncatePosition = block.length;

    for (const keyword of strictStoppers) {
      const idx = block.toLowerCase().indexOf(keyword);
      if (idx !== -1 && idx < truncatePosition) {
        truncatePosition = idx;
      }
    }
    abstract = block.substring(0, truncatePosition).trim();
  }

  return { title, author, abstract, year };
}