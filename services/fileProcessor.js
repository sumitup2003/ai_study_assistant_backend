const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const axios = require('axios');

class FileProcessor {
  async extractText(fileUrl, fileType) {
    try {
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);

      switch (fileType) {
        case 'pdf':
          return await this.extractFromPDF(buffer);
        case 'docx':
          return await this.extractFromDOCX(buffer);
        case 'txt':
          return buffer.toString('utf-8');
        default:
          throw new Error('Unsupported file type');
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      throw error;
    }
  }

  async extractFromPDF(buffer) {
    const data = await pdfParse(buffer);
    return {
      text: data.text,
      pages: data.numpages,
      info: data.info
    };
  }

  async extractFromDOCX(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value,
      pages: Math.ceil(result.value.length / 3000) // Approximate
    };
  }

  countWords(text) {
    return text.trim().split(/\s+/).length;
  }

  chunkText(text, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    const words = text.split(/\s+/);
    
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      chunks.push({
        text: chunk,
        index: chunks.length
      });
    }
    
    return chunks;
  }
}

module.exports = new FileProcessor();